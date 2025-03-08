import numpy as np
import pandas as pd

from jupyter_paint_segment.types import Array3, ArrayNx3, ArrayNxMx3


def remove_noisy_pixels(
    image_rgb: ArrayNxMx3[np.uint8],
    allowed_pixels: ArrayNx3[np.uint8],
) -> ArrayNxMx3[np.uint8]:
    """
    Replace all image pixels with closest pixel from allowed pixels set.
    """
    obtained_pixels = unique_image_pixels(image_rgb)
    # print(f"{obtained_pixels=}")

    for pixel in obtained_pixels:
        closest_allowed_pixel = get_closest_pixel(pixel, allowed_pixels)
        # print(pixel, closest_allowed_pixel)

        image_rgb = replace_image_pixel(
            image_rgb=image_rgb,
            source_pixel=pixel,
            target_pixel=closest_allowed_pixel,
        )

    return image_rgb


def unique_image_pixels(image_rgb: ArrayNxMx3[np.uint8]) -> ArrayNx3[np.uint8]:
    """
    Returns set of unique pixel colors on image.
    """
    image_reshaped = image_rgb.reshape((-1, 3))
    ## optimized solution O(n)
    unique_pixels = pd.DataFrame(image_reshaped).drop_duplicates().to_numpy()
    ## slow solution O(n log n)
    # unique_pixels = np.unique(image_reshaped, axis=0)
    return unique_pixels


def get_closest_pixel(
    target_pixel: Array3[np.uint8],
    pixels_set: ArrayNx3[np.uint8],
) -> Array3[np.uint8]:
    """
    Returns closest pixel to `target_pixel` from a `pixel_set`.
    """
    target_pixel = target_pixel.copy().astype(np.int64)
    pixels_set = pixels_set.copy().astype(np.int64)

    diff_rgb = pixels_set - target_pixel
    diff = np.linalg.norm(diff_rgb, axis=1)
    closest_index = diff.argmin()
    return pixels_set[closest_index].astype(np.uint8)


def replace_image_pixel(
    image_rgb: ArrayNxMx3[np.uint8],
    source_pixel: Array3[np.uint8],
    target_pixel: Array3[np.uint8],
) -> ArrayNxMx3[np.uint8]:
    """
    Replaces all `source_pixel` values on RGB image with `target_pixel` values.
    Does not change input `image_rgb` array, create new.
    """
    image = np.copy(image_rgb)
    # image = image_rgb
    source_pixel_r, source_pixel_g, source_pixel_b = source_pixel
    target_pixel_r, target_pixel_g, target_pixel_b = target_pixel

    source_pixel_indexes = np.where(
        (image[:, :, 0] == source_pixel_r)
        & (image[:, :, 1] == source_pixel_g)
        & (image[:, :, 2] == source_pixel_b)
    )
    y, x = source_pixel_indexes
    image[y, x, 0] = target_pixel_r
    image[y, x, 1] = target_pixel_g
    image[y, x, 2] = target_pixel_b

    return image
