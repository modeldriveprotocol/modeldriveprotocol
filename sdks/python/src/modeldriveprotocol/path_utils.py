from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Dict, List, Optional

STATIC_SEGMENT_PATTERN = re.compile(r"^(?:[a-z0-9](?:[a-z0-9_-]*)?|\.[a-z0-9](?:[a-z0-9_-]*)?)$")
PARAM_SEGMENT_PATTERN = re.compile(r"^:[a-z0-9](?:[a-z0-9_-]*)$")
RESERVED_LEAF_NAMES = {"skill.md", "prompt.md", "SKILL.md", "PROMPT.md"}


@dataclass
class PathPatternMatch:
    params: Dict[str, object]
    specificity: List[int]


def is_path_pattern(value: object) -> bool:
    return _validate_path(value, allow_params=True)


def is_concrete_path(value: object) -> bool:
    return _validate_path(value, allow_params=False)


def is_skill_path(value: object) -> bool:
    if not is_path_pattern(value):
        return False
    leaf = _split_path(value).pop() if _split_path(value) else ""
    return leaf in {"skill.md", "SKILL.md"}


def is_prompt_path(value: object) -> bool:
    if not is_path_pattern(value):
        return False
    leaf = _split_path(value).pop() if _split_path(value) else ""
    return leaf in {"prompt.md", "PROMPT.md"}


def match_path_pattern(pattern: str, path: str) -> Optional[PathPatternMatch]:
    if not is_path_pattern(pattern) or not is_concrete_path(path):
        return None

    pattern_segments = _split_path(pattern)
    path_segments = _split_path(path)

    if len(pattern_segments) != len(path_segments):
        return None

    params: Dict[str, object] = {}
    specificity: List[int] = []

    for pattern_segment, path_segment in zip(pattern_segments, path_segments):
        if pattern_segment.startswith(":"):
            params[pattern_segment[1:]] = path_segment
            specificity.append(0)
            continue

        if pattern_segment != path_segment:
            return None

        specificity.append(1 if _is_reserved_leaf_name(pattern_segment) else 2)

    return PathPatternMatch(params=params, specificity=specificity)


def compare_path_specificity(left: List[int], right: List[int]) -> int:
    length = max(len(left), len(right))
    for index in range(length):
        left_value = left[index] if index < len(left) else -1
        right_value = right[index] if index < len(right) else -1
        if left_value != right_value:
            return left_value - right_value
    return 0


def _validate_path(value: object, *, allow_params: bool) -> bool:
    if not isinstance(value, str) or not value.startswith("/") or "?" in value or "#" in value:
        return False

    segments = _split_path(value)
    if not segments:
        return False

    for index, segment in enumerate(segments):
        if not segment:
            return False
        is_last = index == len(segments) - 1
        if _is_reserved_leaf_name(segment):
            if not is_last:
                return False
            continue
        if allow_params and PARAM_SEGMENT_PATTERN.match(segment):
            continue
        if not STATIC_SEGMENT_PATTERN.match(segment):
            return False

    return True


def _split_path(value: str) -> List[str]:
    return value.split("/")[1:]


def _is_reserved_leaf_name(value: str) -> bool:
    return value in RESERVED_LEAF_NAMES
