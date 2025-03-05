import base64
import io
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import anywidget
import cv2 as cv
import matplotlib.colors
import numpy as np
import traitlets
from PIL import Image

REPO_DIR = Path(__file__).parent.parent.parent
JS_CODE = REPO_DIR / "js" / "paint_widget.js"
CSS = REPO_DIR / "js" / "styles.css"

# CURRENT_DIR = Path(__file__).parent
# JS_CODE = CURRENT_DIR / "static" / "paint_widget.js"
# CSS = CURRENT_DIR / "static" / "styles.css"

DEFAULT_COLORS = [
    "#2ca02c",  # cooked asparagus green
    "#d62728",  # brick red
    "#fefe00",  # yellow
    "#1f77b4",  # muted blue
    "#ff7f0e",  # safety orange
    "#9467bd",  # muted purple
    "#8c564b",  # chestnut brown
    "#17becf",  # blue-teal
    "#e377c2",  # raspberry yogurt pink
    "#7f7f7f",  # middle gray
    "#bcbd22",  # curry yellow-green
]


class SegmentWidget(anywidget.AnyWidget):
    _esm = JS_CODE
    _css = CSS

    _image_data = traitlets.Unicode().tag(sync=True)
    _image_height = traitlets.Int().tag(sync=True)
    _image_width = traitlets.Int().tag(sync=True)

    _scale_factor = traitlets.Float(1).tag(sync=True)

    _drawing_base64 = traitlets.Unicode().tag(sync=True)

    _label_titles = traitlets.List(traitlets.Unicode).tag(sync=True)
    _colors = traitlets.List(traitlets.Unicode).tag(sync=True)

    def __init__(
        self,
        image: np.ndarray,
        labels: List[str],
        colors: Optional[List[str]] = None,
        image_scale: float = 1,
    ):
        self.image = cv.cvtColor(image, cv.COLOR_RGBA2RGB)
        self._image_height = self.image.shape[0]
        self._image_width = self.image.shape[1]
        self._image_data = self._image_to_base64str(self.image)

        self._scale_factor = image_scale

        self.n_labels = len(labels)
        self._label_titles = labels
        if colors:
            self._colors = [matplotlib.colors.to_hex(c, keep_alpha=False) for c in colors]  # fmt: skip
        else:
            # TODO: case when n_labels > len(DEFAULT_COLORS)
            self._colors = DEFAULT_COLORS[: self.n_labels]

        self._validate_input_params()

        super().__init__()

    def segmentation_result(self) -> Tuple[np.ndarray, Dict[str, int]]:
        drawing_rgb = self._base64str_to_image(self._drawing_base64)

        if self._scale_factor != 1:
            drawing_rgb = cv.resize(
                src=drawing_rgb,
                dsize=(self._image_width, self._image_height),
                interpolation=cv.INTER_NEAREST,
            )

        self._validate_drawing(drawing_rgb)

        # convert drawing to 2d labels array
        drawing_hex_array = self._rgb_to_hex_image(drawing_rgb)

        colors = self._colors.copy()
        label_titles = self._label_titles.copy()
        label_numbers = list(range(1, len(self._colors) + 1))

        ## add background label
        colors.append("#000000")
        label_numbers.append(0)
        label_titles.append("unlabeled_background")

        map_color_label_num = dict(zip(colors, label_numbers))
        map_label_title_label_num = dict(zip(label_titles, label_numbers))

        hex_color_to_label = np.vectorize(map_color_label_num.get)
        labels_array = hex_color_to_label(drawing_hex_array)

        return labels_array, map_label_title_label_num

    def _validate_input_params(self) -> None:
        if len(self._label_titles) != len(set(self._label_titles)):
            raise ValueError("Label titles should be unique")

        if len(self._colors) != self.n_labels:
            raise ValueError("Number of colors should be same as number of labels")

        if len(self._colors) != len(set(self._colors)):
            raise ValueError("Colors should be unique")

        if "#000000" in self._colors:
            raise ValueError(
                "Black color is forbidden, it is reserved by a background class"
            )

    def _validate_drawing(self, drawing_rgb_array: np.ndarray) -> None:
        if len(drawing_rgb_array.shape) != 3 or drawing_rgb_array.shape[2] != 3:
            raise Exception(
                f"Exported drawing has shape {drawing_rgb_array.shape}, but expected (N, M, 3)"
            )

        # check that drawing colors are valid
        drawing_hex_array = self._rgb_to_hex_image(drawing_rgb_array)
        drawing_colors_set = set(np.unique(drawing_hex_array))

        allowed_colors_set = set(self._colors.copy())
        allowed_colors_set.add("#000000")

        if not drawing_colors_set.issubset(allowed_colors_set):
            raise Exception(
                f"Exported drawing contains unexpected colors, {drawing_colors_set=}, {allowed_colors_set=}"
            )

    @staticmethod
    def _image_to_base64str(image_rgb: np.ndarray) -> str:
        image_bgr = cv.cvtColor(image_rgb, cv.COLOR_RGB2BGR)
        retval, buffer_img = cv.imencode(".png", image_bgr)
        image_base64 = base64.b64encode(buffer_img)

        image_base64_str = "data:image/png;base64," + image_base64.decode()
        return image_base64_str

    @staticmethod
    def _base64str_to_image(image_base64: str) -> np.ndarray:
        if not image_base64.startswith("data:image/png;base64,"):
            raise ValueError("base64 encoded image is not valid")

        base64_data = image_base64.removeprefix("data:image/png;base64,")
        base64_decoded = base64.b64decode(base64_data)
        image_pil = Image.open(io.BytesIO(base64_decoded))
        image = np.array(image_pil)

        if len(image.shape) != 3 or image.shape[2] != 4:
            raise Exception(
                f"Exported drawing conversion to numpy array failed, image_shape={image.shape}, but expected (n, m, 4)"
            )

        image_rgb = cv.cvtColor(image, cv.COLOR_RGBA2RGB)
        return image_rgb

    @staticmethod
    def _rgb_to_hex_image(image: np.ndarray) -> np.ndarray:
        """
        Convert rgb numpy array to hex numpy array

        :param image: image data, shape = (N, M, 3), dtype=uint8
        :return: array with hex colors, shape = (N, M), dtype=str
        """
        r_channel = image[:, :, 0]
        g_channel = image[:, :, 1]
        b_channel = image[:, :, 2]

        array_to_hex = np.vectorize("{:02x}".format)
        image_array_hex = np.char.add("#", array_to_hex(r_channel))
        image_array_hex = np.char.add(image_array_hex, array_to_hex(g_channel))
        image_array_hex = np.char.add(image_array_hex, array_to_hex(b_channel))

        return image_array_hex
