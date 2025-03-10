# jupyter-paint-segment


## Overview

A jupyter widget for interactive drawing segmentation masks.

Brush, rectangle and eraser tools are available.
Size of brush and eraser can be changed using slider.


![](./docs/images/sheep_dog_interactive_v2.gif)


---

## Installation

```sh
pip install jupyter_paint_segment
```

requires: python >= 3.9


---

## Usage

Demo notebook: `./examples/main.ipynb`


1. Load image into numpy array:
```python
# with PIL: 
from PIL import Image
import numpy as np
pilImage = Image.open("./examples/images/sheeps.png")
image = np.array(pilImage)

# or with opencv:
import cv2 as cv
image_bgr = cv.imread("./examples/images/sheeps.png")
image = cv.cvtColor(image_bgr, cv.COLOR_BGR2RGB)
```

2. Define labels and colors (optionally) and create widget:
```python
from jupyter_paint_segment import SegmentWidget

widget = SegmentWidget(
    image=image,
    labels=["sheep", "dog"],
    colors=["red", "blue"],
    image_scale=1,
)
widget
```


3. Get segmentation results:
```python
labels_array, labels_map = widget.segmentation_result()

labels_map
# {'sheep': 1, 'dog': 2, 'unlabeled_background': 0}
labels_array
# array([[0, 0, 0, ..., 0, 0, 0],
#        [0, 0, 0, ..., 0, 0, 0],
#        [0, 0, 0, ..., 0, 0, 0],
#        ...,
#        [0, 0, 0, ..., 0, 0, 0],
#        [0, 0, 0, ..., 0, 0, 0],
#        [0, 0, 0, ..., 0, 0, 0]])
```

```python
import matplotlib.pyplot as plt

plt.imshow(labels_array)
```

![](./docs/images/result_seg_mask.png)


---


## Related projects

This project was highly inspired by [jupyter-bbox-widget](https://github.com/gereleth/jupyter-bbox-widget).


---

## License

This project is licensed under the [MIT license](https://github.com/adusachev/jupyter-paint-segment/blob/master/LICENSE).

---

