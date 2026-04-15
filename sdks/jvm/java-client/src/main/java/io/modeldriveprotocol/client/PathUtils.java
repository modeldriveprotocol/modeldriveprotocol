package io.modeldriveprotocol.client;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

final class PathUtils {
  private static final Pattern STATIC_SEGMENT_PATTERN =
      Pattern.compile("^(?:[a-z0-9](?:[a-z0-9_-]*)?|\\.[a-z0-9](?:[a-z0-9_-]*)?)$");
  private static final Pattern PARAM_SEGMENT_PATTERN =
      Pattern.compile("^:[a-z0-9](?:[a-z0-9_-]*)$");
  private static final Set<String> RESERVED_LEAF_NAMES =
      Set.of("skill.md", "prompt.md", "SKILL.md", "PROMPT.md");

  private PathUtils() {}

  static boolean isPathPattern(String value) {
    return validatePath(value, true);
  }

  static boolean isConcretePath(String value) {
    return validatePath(value, false);
  }

  static boolean isSkillPath(String value) {
    List<String> segments = splitPath(value);
    if (!isPathPattern(value) || segments.isEmpty()) {
      return false;
    }
    String leaf = segments.get(segments.size() - 1);
    return "skill.md".equals(leaf) || "SKILL.md".equals(leaf);
  }

  static boolean isPromptPath(String value) {
    List<String> segments = splitPath(value);
    if (!isPathPattern(value) || segments.isEmpty()) {
      return false;
    }
    String leaf = segments.get(segments.size() - 1);
    return "prompt.md".equals(leaf) || "PROMPT.md".equals(leaf);
  }

  static PathPatternMatch matchPathPattern(String pattern, String path) {
    if (!isPathPattern(pattern) || !isConcretePath(path)) {
      return null;
    }

    List<String> patternSegments = splitPath(pattern);
    List<String> pathSegments = splitPath(path);
    if (patternSegments.size() != pathSegments.size()) {
      return null;
    }

    Map<String, Object> params = new LinkedHashMap<>();
    List<Integer> specificity = new ArrayList<>();
    for (int index = 0; index < patternSegments.size(); index += 1) {
      String patternSegment = patternSegments.get(index);
      String pathSegment = pathSegments.get(index);
      if (patternSegment.startsWith(":")) {
        params.put(patternSegment.substring(1), pathSegment);
        specificity.add(0);
        continue;
      }

      if (!patternSegment.equals(pathSegment)) {
        return null;
      }

      specificity.add(RESERVED_LEAF_NAMES.contains(patternSegment) ? 1 : 2);
    }

    return new PathPatternMatch(params, specificity);
  }

  static int comparePathSpecificity(List<Integer> left, List<Integer> right) {
    int maxLength = Math.max(left.size(), right.size());
    for (int index = 0; index < maxLength; index += 1) {
      int leftValue = index < left.size() ? left.get(index) : -1;
      int rightValue = index < right.size() ? right.get(index) : -1;
      if (leftValue != rightValue) {
        return leftValue - rightValue;
      }
    }
    return 0;
  }

  private static boolean validatePath(String value, boolean allowParams) {
    if (value == null || !value.startsWith("/") || value.contains("?") || value.contains("#")) {
      return false;
    }

    List<String> segments = splitPath(value);
    if (segments.isEmpty()) {
      return false;
    }

    for (int index = 0; index < segments.size(); index += 1) {
      String segment = segments.get(index);
      if (segment.isEmpty()) {
        return false;
      }

      boolean isLast = index == segments.size() - 1;
      if (RESERVED_LEAF_NAMES.contains(segment)) {
        if (!isLast) {
          return false;
        }
        continue;
      }

      if (allowParams && PARAM_SEGMENT_PATTERN.matcher(segment).matches()) {
        continue;
      }

      if (!STATIC_SEGMENT_PATTERN.matcher(segment).matches()) {
        return false;
      }
    }

    return true;
  }

  private static List<String> splitPath(String value) {
    String[] segments = value.split("/");
    List<String> result = new ArrayList<>();
    for (int index = 1; index < segments.length; index += 1) {
      result.add(segments[index]);
    }
    return result;
  }

  record PathPatternMatch(Map<String, Object> params, List<Integer> specificity) {}
}
