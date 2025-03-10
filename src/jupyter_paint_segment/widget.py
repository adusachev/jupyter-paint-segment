from pathlib import Path
from typing import Dict, List, Optional, Tuple

import anywidget
import cv2 as cv
import matplotlib.colors
import numpy as np
import traitlets
from PIL import ImageColor

from jupyter_paint_segment.postprocess import remove_noisy_pixels
from jupyter_paint_segment.types import ArrayNx3, ArrayNxM, ArrayNxMx3
from jupyter_paint_segment.utils import base64str_to_image, image_to_base64str

DEFAULT_COLORS = [
    "#2ca02c",  # cooked asparagus green
    "#d62728",  # brick red
    "#fefe00",  # just yellow
    "#1f77b4",  # muted blue
    "#ff7f0e",  # safety orange
    "#9467bd",  # muted purple
    "#8c564b",  # chestnut brown
    "#17becf",  # blue-teal
    "#e377c2",  # raspberry yogurt pink
    "#7f7f7f",  # middle gray
    "#bcbd22",  # curry yellow-green
]


CURRENT_DIR = Path(__file__).parent
JS_PATH = CURRENT_DIR / "static" / "paint_widget.js"
CSS_PATH = CURRENT_DIR / "static" / "styles.css"


class SegmentWidget(anywidget.AnyWidget):
    _esm = JS_PATH
    _css = CSS_PATH

    _image_data = traitlets.Unicode().tag(sync=True)
    _image_height = traitlets.Int().tag(sync=True)
    _image_width = traitlets.Int().tag(sync=True)

    _scale_factor = traitlets.Float(1).tag(sync=True)

    _drawing_base64 = traitlets.Unicode().tag(sync=True)

    _label_titles = traitlets.List(traitlets.Unicode).tag(sync=True)
    _colors = traitlets.List(traitlets.Unicode).tag(sync=True)

    def __init__(
        self,
        image: ArrayNxMx3[np.uint8],
        labels: List[str],
        colors: Optional[List[str]] = None,
        image_scale: float = 1,
    ):
        self.image = cv.cvtColor(image, cv.COLOR_RGBA2RGB)
        self._image_height = self.image.shape[0]
        self._image_width = self.image.shape[1]
        self._image_data = image_to_base64str(self.image)

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

    @property
    def _colors_hex_with_bg(self) -> List[str]:
        colors = self._colors.copy()
        colors.append("#000000")  # add background
        return colors

    @property
    def _colors_rgb_with_bg(self) -> ArrayNx3[np.uint8]:
        colors_rgb = [ImageColor.getcolor(hex_color, mode="RGB") for hex_color in self._colors_hex_with_bg]  # fmt: skip
        return np.array(colors_rgb, dtype=np.uint8)

    @property
    def _label_numbers_with_bg(self) -> List[int]:
        label_numbers = list(range(1, len(self._colors) + 1))
        label_numbers.append(0)  # add background
        return label_numbers

    @property
    def _label_titles_with_bg(self) -> List[str]:
        label_titles = self._label_titles.copy()
        label_titles.append("unlabeled_background")  # add background
        return label_titles

    @property
    def _drawing_rgb(self) -> ArrayNxMx3[np.uint8]:
        return base64str_to_image(self._drawing_base64)

    def segmentation_result(self) -> Tuple[ArrayNxM[np.int64], Dict[str, int]]:
        drawing_rgb = self._drawing_rgb
        drawing_rgb = self._postprocess_drawing(drawing_rgb)
        self._validate_drawing(drawing_rgb)

        # create 2D label numbers array from obtained drawing
        labels_array = np.zeros_like(drawing_rgb[:, :, 0], dtype=np.int64)

        colors_rgb_as_tuple = [tuple(pixel) for pixel in self._colors_rgb_with_bg]
        map_color_rgb_label_num = dict(
            zip(colors_rgb_as_tuple, self._label_numbers_with_bg)
        )

        for pixel_value in colors_rgb_as_tuple:
            pixel_r, pixel_g, pixel_b = pixel_value

            pixel_indexes = np.where(
                (drawing_rgb[:, :, 0] == pixel_r)
                & (drawing_rgb[:, :, 1] == pixel_g)
                & (drawing_rgb[:, :, 2] == pixel_b)
            )
            y, x = pixel_indexes

            labels_array[y, x] = map_color_rgb_label_num[pixel_value]

        # create map with label titles and label numbers
        map_label_title_label_num = dict(
            zip(self._label_titles_with_bg, self._label_numbers_with_bg)
        )

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

    def _postprocess_drawing(
        self, drawing_rgb: ArrayNxMx3[np.uint8]
    ) -> ArrayNxMx3[np.uint8]:
        image_postprocessed = remove_noisy_pixels(
            image_rgb=drawing_rgb,
            allowed_pixels=self._colors_rgb_with_bg,
        )
        return image_postprocessed

    def _validate_drawing(self, drawing_rgb: ArrayNxMx3[np.uint8]) -> None:
        if drawing_rgb.shape != self.image.shape:
            raise Exception(
                f"Exported drawing shape differs from original image shape, drawing_shape={drawing_rgb.shape}, image_shape={self.image.shape}"
            )
