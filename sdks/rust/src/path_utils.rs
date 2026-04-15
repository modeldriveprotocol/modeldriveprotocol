use once_cell::sync::Lazy;
use regex::Regex;
use serde_json::{Map, Value};

static STATIC_SEGMENT_PATTERN: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"^(?:[a-z0-9](?:[a-z0-9_-]*)?|\.[a-z0-9](?:[a-z0-9_-]*)?)$").unwrap()
});
static PARAM_SEGMENT_PATTERN: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"^:[a-z0-9](?:[a-z0-9_-]*)$").unwrap());
static RESERVED_LEAF_NAMES: &[&str] = &["skill.md", "prompt.md", "SKILL.md", "PROMPT.md"];

#[derive(Clone, Debug, PartialEq)]
pub struct PathPatternMatch {
    pub params: Map<String, Value>,
    pub specificity: Vec<i32>,
}

pub fn is_path_pattern(value: &str) -> bool {
    validate_path(value, true)
}

pub fn is_concrete_path(value: &str) -> bool {
    validate_path(value, false)
}

pub fn is_skill_path(value: &str) -> bool {
    is_path_pattern(value)
        && split_path(value)
            .last()
            .map(|segment| *segment == "skill.md" || *segment == "SKILL.md")
            .unwrap_or(false)
}

pub fn is_prompt_path(value: &str) -> bool {
    is_path_pattern(value)
        && split_path(value)
            .last()
            .map(|segment| *segment == "prompt.md" || *segment == "PROMPT.md")
            .unwrap_or(false)
}

pub fn match_path_pattern(pattern: &str, path: &str) -> Option<PathPatternMatch> {
    if !is_path_pattern(pattern) || !is_concrete_path(path) {
        return None;
    }

    let pattern_segments = split_path(pattern);
    let path_segments = split_path(path);
    if pattern_segments.len() != path_segments.len() {
        return None;
    }

    let mut params = Map::new();
    let mut specificity = Vec::with_capacity(pattern_segments.len());

    for (pattern_segment, path_segment) in pattern_segments.iter().zip(path_segments.iter()) {
        if let Some(param_name) = pattern_segment.strip_prefix(':') {
            params.insert(param_name.to_string(), Value::String((*path_segment).to_string()));
            specificity.push(0);
            continue;
        }

        if pattern_segment != path_segment {
            return None;
        }

        specificity.push(if is_reserved_leaf_name(pattern_segment) { 1 } else { 2 });
    }

    Some(PathPatternMatch { params, specificity })
}

pub fn compare_path_specificity(left: &[i32], right: &[i32]) -> i32 {
    let max_length = left.len().max(right.len());
    for index in 0..max_length {
        let left_value = left.get(index).copied().unwrap_or(-1);
        let right_value = right.get(index).copied().unwrap_or(-1);
        if left_value != right_value {
            return left_value - right_value;
        }
    }
    0
}

fn validate_path(value: &str, allow_params: bool) -> bool {
    if !value.starts_with('/') || value.contains('?') || value.contains('#') {
        return false;
    }

    let segments = split_path(value);
    if segments.is_empty() {
        return false;
    }

    for (index, segment) in segments.iter().enumerate() {
        if segment.is_empty() {
            return false;
        }

        let is_last = index == segments.len() - 1;
        if is_reserved_leaf_name(segment) {
            if !is_last {
                return false;
            }
            continue;
        }

        if allow_params && PARAM_SEGMENT_PATTERN.is_match(segment) {
            continue;
        }

        if !STATIC_SEGMENT_PATTERN.is_match(segment) {
            return false;
        }
    }

    true
}

fn split_path(value: &str) -> Vec<&str> {
    value.split('/').skip(1).collect()
}

fn is_reserved_leaf_name(value: &str) -> bool {
    RESERVED_LEAF_NAMES.contains(&value)
}
