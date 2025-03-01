import base64
import io
from pathlib import Path

import anywidget
import cv2 as cv
import numpy as np
import traitlets
from PIL import Image

REPO_DIR = Path(__file__).parent.parent.parent
JS_CODE = REPO_DIR / "js" / "canvas_paint.js"
CSS = REPO_DIR / "js" / "styles.css"

# CURRENT_DIR = Path(__file__).parent
# JS_CODE = CURRENT_DIR / "static" / "canvas.js"
# CSS = CURRENT_DIR / "static" / "styles.css"


class SegmentWidget(anywidget.AnyWidget):
    _esm = JS_CODE
    _css = CSS

    _image_data = traitlets.Unicode().tag(sync=True)

    _image_height = traitlets.Int().tag(sync=True)
    _image_width = traitlets.Int().tag(sync=True)

    _scale_factor = traitlets.Float(1).tag(sync=True)

    _drawing_base64 = traitlets.Unicode().tag(sync=True)

    def __init__(self, image, n_labels, colors=None, titles=None, image_scale=1):
        self.image = image
        self._image_height = image.shape[0]
        self._image_width = image.shape[1]

        self._image_data = self._image_to_base64str(image)
        # self.n_labels = n_labels

        self._scale_factor = image_scale

        super().__init__()

    def segmentation_result(self) -> np.ndarray:
        drawing_array = self._base64str_to_image(self._drawing_base64)
        if self._scale_factor != 1:
            drawing_resized = cv.resize(
                src=drawing_array,
                dsize=(self._image_width, self._image_height),
                interpolation=cv.INTER_NEAREST,
            )
            return drawing_resized

        return drawing_array

    @staticmethod
    def _image_to_base64str(image: np.ndarray) -> str:

        retval, buffer_img = cv.imencode(".png", image)
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
                f"Mask image conversion to numpy array failed, image_shape={image.shape}, but expected (n, m, 4)"
            )

        image = image[:, :, :3]  # completely remove alpha channel
        return image
