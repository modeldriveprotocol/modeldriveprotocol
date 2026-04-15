using System.Text.RegularExpressions;

namespace ModelDriveProtocol.Client;

public sealed record PathPatternMatch(
    IReadOnlyDictionary<string, object?> Params,
    IReadOnlyList<int> Specificity);

public static partial class PathUtils
{
    private static readonly HashSet<string> ReservedLeafNames = new(StringComparer.Ordinal)
    {
        "skill.md",
        "prompt.md",
        "SKILL.md",
        "PROMPT.md"
    };

    public static bool IsPathPattern(string value) => ValidatePath(value, allowParams: true);

    public static bool IsConcretePath(string value) => ValidatePath(value, allowParams: false);

    public static bool IsSkillPath(string value)
    {
        if (!IsPathPattern(value))
        {
            return false;
        }

        string[] segments = SplitPath(value);
        return segments.Length > 0 && (segments[^1] == "skill.md" || segments[^1] == "SKILL.md");
    }

    public static bool IsPromptPath(string value)
    {
        if (!IsPathPattern(value))
        {
            return false;
        }

        string[] segments = SplitPath(value);
        return segments.Length > 0 && (segments[^1] == "prompt.md" || segments[^1] == "PROMPT.md");
    }

    public static PathPatternMatch? MatchPathPattern(string pattern, string path)
    {
        if (!IsPathPattern(pattern) || !IsConcretePath(path))
        {
            return null;
        }

        string[] patternSegments = SplitPath(pattern);
        string[] pathSegments = SplitPath(path);
        if (patternSegments.Length != pathSegments.Length)
        {
            return null;
        }

        Dictionary<string, object?> parameters = new(StringComparer.Ordinal);
        List<int> specificity = new(patternSegments.Length);

        for (int index = 0; index < patternSegments.Length; index += 1)
        {
            string patternSegment = patternSegments[index];
            string pathSegment = pathSegments[index];

            if (patternSegment.StartsWith(':'))
            {
                parameters[patternSegment[1..]] = pathSegment;
                specificity.Add(0);
                continue;
            }

            if (!string.Equals(patternSegment, pathSegment, StringComparison.Ordinal))
            {
                return null;
            }

            specificity.Add(IsReservedLeafName(patternSegment) ? 1 : 2);
        }

        return new PathPatternMatch(parameters, specificity);
    }

    public static int ComparePathSpecificity(IReadOnlyList<int> left, IReadOnlyList<int> right)
    {
        int maxLength = Math.Max(left.Count, right.Count);
        for (int index = 0; index < maxLength; index += 1)
        {
            int leftValue = index < left.Count ? left[index] : -1;
            int rightValue = index < right.Count ? right[index] : -1;
            if (leftValue != rightValue)
            {
                return leftValue.CompareTo(rightValue);
            }
        }
        return 0;
    }

    private static bool ValidatePath(string value, bool allowParams)
    {
        if (string.IsNullOrWhiteSpace(value) || !value.StartsWith('/') || value.Contains('?') || value.Contains('#'))
        {
            return false;
        }

        string[] segments = SplitPath(value);
        if (segments.Length == 0)
        {
            return false;
        }

        for (int index = 0; index < segments.Length; index += 1)
        {
            string segment = segments[index];
            bool isLast = index == segments.Length - 1;
            if (string.IsNullOrEmpty(segment))
            {
                return false;
            }
            if (IsReservedLeafName(segment))
            {
                if (!isLast)
                {
                    return false;
                }
                continue;
            }
            if (allowParams && ParameterSegment().IsMatch(segment))
            {
                continue;
            }
            if (!StaticSegment().IsMatch(segment))
            {
                return false;
            }
        }

        return true;
    }

    private static string[] SplitPath(string value) =>
        value.TrimStart('/').Split('/');

    private static bool IsReservedLeafName(string value) => ReservedLeafNames.Contains(value);

    [GeneratedRegex("^(?:[a-z0-9](?:[a-z0-9_-]*)?|\\.[a-z0-9](?:[a-z0-9_-]*)?)$")]
    private static partial Regex StaticSegment();

    [GeneratedRegex("^:[a-z0-9](?:[a-z0-9_-]*)$")]
    private static partial Regex ParameterSegment();
}
