import base64
from pathlib import Path

import anywidget
import cv2 as cv
import numpy as np
import traitlets

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

    def __init__(self, image, n_labels, colors=None, titles=None, image_scale=1):
        self.image = image
        self._image_height = image.shape[0]
        self._image_width = image.shape[1]

        self._image_data = self._image_to_base64str(image)
        # self.n_labels = n_labels

        super().__init__()

    @staticmethod
    def _image_to_base64str(image: np.ndarray) -> str:

        retval, buffer_img = cv.imencode(".png", image)
        image_base64 = base64.b64encode(buffer_img)

        image_base64_str = "data:image/png;base64," + image_base64.decode()

        return image_base64_str
