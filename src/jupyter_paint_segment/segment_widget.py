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

    _scale_factor = traitlets.Float(1).tag(sync=True)

    def set_image(self, image: np.ndarray) -> None:
        self._image_data = image_to_base64str(image)

    def apply_widget_settings(self, scale_image: float = 1) -> None:
        self._scale_factor = scale_image


def image_to_base64str(image: np.ndarray) -> str:

    retval, buffer_img = cv.imencode(".png", image)
    image_base64 = base64.b64encode(buffer_img)

    image_base64_str = "data:image/png;base64," + image_base64.decode()

    return image_base64_str
