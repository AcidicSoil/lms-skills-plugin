#!/usr/bin/env python3
"""Generate edge case categories for a function based on parameter types."""

import argparse
import json

HEURISTICS = {
    "str": [
        {"category": "null/empty", "input": '""', "rationale": "Empty string may bypass validation"},
        {"category": "null/empty", "input": "None", "rationale": "None instead of string may cause TypeError"},
        {"category": "boundary", "input": '"a" * 10000', "rationale": "Very long string may exceed limits or cause performance issues"},
        {"category": "boundary", "input": '" "', "rationale": "Whitespace-only string may pass empty checks but cause logic errors"},
        {"category": "unicode", "input": '"\\u200b"', "rationale": "Zero-width space is invisible but non-empty"},
        {"category": "unicode", "input": '"\\U0001f600"', "rationale": "Emoji may break length calculations or encoding"},
        {"category": "unicode", "input": '"\\u202e"', "rationale": "RTL override can cause display/security issues"},
        {"category": "type_coercion", "input": "123", "rationale": "Integer instead of string tests type handling"},
        {"category": "type_coercion", "input": "b'bytes'", "rationale": "Bytes instead of string tests encoding handling"},
    ],
    "int": [
        {"category": "null/empty", "input": "None", "rationale": "None instead of int may cause TypeError"},
        {"category": "null/empty", "input": "0", "rationale": "Zero is falsy and may bypass truthiness checks"},
        {"category": "boundary", "input": "2**31 - 1", "rationale": "Max 32-bit signed integer"},
        {"category": "boundary", "input": "-(2**31)", "rationale": "Min 32-bit signed integer"},
        {"category": "boundary", "input": "-1", "rationale": "Negative values may not be handled"},
        {"category": "overflow", "input": "2**63", "rationale": "Exceeds 64-bit signed integer range"},
        {"category": "overflow", "input": "10**100", "rationale": "Very large integer may cause memory or performance issues"},
        {"category": "type_coercion", "input": '"123"', "rationale": "String instead of int tests type handling"},
        {"category": "type_coercion", "input": "1.5", "rationale": "Float instead of int tests truncation behavior"},
        {"category": "type_coercion", "input": "True", "rationale": "Boolean is a subclass of int in Python"},
    ],
    "float": [
        {"category": "null/empty", "input": "None", "rationale": "None instead of float may cause TypeError"},
        {"category": "null/empty", "input": "0.0", "rationale": "Zero float is falsy"},
        {"category": "boundary", "input": "float('inf')", "rationale": "Infinity may propagate through calculations"},
        {"category": "boundary", "input": "float('-inf')", "rationale": "Negative infinity"},
        {"category": "boundary", "input": "float('nan')", "rationale": "NaN is not equal to itself, breaks comparisons"},
        {"category": "boundary", "input": "sys.float_info.min", "rationale": "Smallest positive float"},
        {"category": "boundary", "input": "sys.float_info.max", "rationale": "Largest finite float"},
        {"category": "overflow", "input": "1e308 * 2", "rationale": "Overflow to infinity"},
        {"category": "type_coercion", "input": '"3.14"', "rationale": "String instead of float"},
    ],
    "list": [
        {"category": "null/empty", "input": "None", "rationale": "None instead of list may cause TypeError"},
        {"category": "null/empty", "input": "[]", "rationale": "Empty list may not be handled"},
        {"category": "boundary", "input": "[None]", "rationale": "List with None element"},
        {"category": "boundary", "input": "list(range(100000))", "rationale": "Very large list tests performance"},
        {"category": "boundary", "input": "[[[[]]]]", "rationale": "Deeply nested list tests recursion limits"},
        {"category": "concurrent", "input": "shared_list", "rationale": "List modified during iteration"},
    ],
    "dict": [
        {"category": "null/empty", "input": "None", "rationale": "None instead of dict may cause TypeError"},
        {"category": "null/empty", "input": "{}", "rationale": "Empty dict may not be handled"},
        {"category": "boundary", "input": "{k: v for k, v in zip(range(100000), range(100000))}", "rationale": "Very large dict tests performance"},
        {"category": "type_coercion", "input": "{'key': None}", "rationale": "None value may cause downstream errors"},
        {"category": "unicode", "input": "{'\\u200b': 'value'}", "rationale": "Zero-width space key is invisible"},
    ],
    "bool": [
        {"category": "null/empty", "input": "None", "rationale": "None instead of bool"},
        {"category": "type_coercion", "input": "0", "rationale": "Falsy int instead of False"},
        {"category": "type_coercion", "input": "1", "rationale": "Truthy int instead of True"},
        {"category": "type_coercion", "input": '""', "rationale": "Falsy string instead of False"},
    ],
}

DEFAULT_CASES = [
    {"category": "null/empty", "input": "None", "rationale": "None input tests null handling"},
    {"category": "type_coercion", "input": "wrong_type", "rationale": "Unexpected type tests error handling"},
]


def generate_edge_cases(function_name: str, params: str) -> dict:
    """Generate edge cases based on function name and parameter types."""
    edge_cases = []
    param_list = []

    if params:
        for param_spec in params.split(","):
            parts = param_spec.strip().split(":")
            param_name = parts[0].strip()
            param_type = parts[1].strip() if len(parts) > 1 else "unknown"
            param_list.append({"name": param_name, "type": param_type})

            type_cases = HEURISTICS.get(param_type, DEFAULT_CASES)
            for case in type_cases:
                edge_cases.append({
                    "parameter": param_name,
                    "parameter_type": param_type,
                    **case,
                })

    return {
        "function": function_name,
        "parameters": param_list,
        "edge_cases": edge_cases,
        "total_cases": len(edge_cases),
        "categories": sorted(set(c["category"] for c in edge_cases)),
    }


def main():
    parser = argparse.ArgumentParser(
        description="Generate edge case categories for a function"
    )
    parser.add_argument("--name", required=True, help="Function name")
    parser.add_argument(
        "--params",
        default="",
        help='Comma-separated param:type pairs (e.g., "name:str,age:int")',
    )
    args = parser.parse_args()

    result = generate_edge_cases(args.name, args.params)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
