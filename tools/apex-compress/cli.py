"""
APEX-COMPRESS CLI
"""

import sys
import json
import argparse
from .pipeline import compress, compress_schema, compress_json_payload

def main():
    parser = argparse.ArgumentParser(description="APEX-COMPRESS CLI")
    subparsers = parser.add_subparsers(dest="command", required=True)
    
    # Prompt command
    prompt_parser = subparsers.add_parser("prompt", help="Compress a system prompt")
    prompt_parser.add_argument("file", help="Path to text file")
    
    # Schema command
    schema_parser = subparsers.add_parser("schema", help="Compress a JSON tool schema")
    schema_parser.add_argument("file", help="Path to JSON file")
    
    # Payload command
    payload_parser = subparsers.add_parser("payload", help="Compress a JSON payload to TOON")
    payload_parser.add_argument("file", help="Path to JSON file")
    
    args = parser.parse_args()
    
    with open(args.file, "r", encoding="utf-8") as f:
        content = f.read()
        
    if args.command == "prompt":
        result = compress(content)
        print(f"Reduction: {result['reduction_percent']}%")
        print("---")
        print(result["compressed"])
        
    elif args.command == "schema":
        schema = json.loads(content)
        result, key_map = compress_schema(schema)
        print(json.dumps(result, indent=2))
        
    elif args.command == "payload":
        payload = json.loads(content)
        toon = compress_json_payload(payload)
        print(toon)

if __name__ == "__main__":
    main()
