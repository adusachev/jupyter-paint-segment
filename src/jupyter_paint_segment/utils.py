import base64
import io

import cv2 as cv
import numpy as np
from PIL import Image

from jupyter_paint_segment.types import ArrayNxM, ArrayNxMx3


def image_to_base64str(image_rgb: ArrayNxMx3[np.uint8]) -> str:
    image_bgr = cv.cvtColor(image_rgb, cv.COLOR_RGB2BGR)
    retval, buffer_img = cv.imencode(".png", image_bgr)
    image_base64 = base64.b64encode(buffer_img)

    image_base64_str = "data:image/png;base64," + image_base64.decode()
    return image_base64_str


def base64str_to_image(image_base64: str) -> ArrayNxMx3[np.uint8]:
    if not image_base64.startswith("data:image/png;base64,"):
        raise ValueError(
            "base64 encoded image is not valid, no prefix 'data:image/png;base64,'"
        )

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


def rgb_to_hex_image(image: ArrayNxMx3[np.uint8]) -> ArrayNxM[np.str_]:
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
