from typing import Annotated, Literal, TypeVar

import numpy as np
import numpy.typing as npt

DType = TypeVar("DType", bound=np.generic)

ArrayNxMx3 = Annotated[npt.NDArray[DType], Literal["N", "M", 3]]
ArrayNxM = Annotated[npt.NDArray[DType], Literal["N", "M"]]
ArrayNx3 = Annotated[npt.NDArray[DType], Literal["N", 3]]
ArrayN = Annotated[npt.NDArray[DType], Literal["N"]]
Array3 = Annotated[npt.NDArray[DType], Literal["3"]]
