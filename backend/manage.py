#!/usr/bin/env python
import os
import sys
from pathlib import Path

def main():
    # Load .env file
    try:
        import dotenv
        # Look for .env file in the same directory as manage.py
        env_path = Path(__file__).resolve().parent / '.env'
        dotenv.load_dotenv(env_path)
    except ImportError:
        pass

    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'canteen.settings')
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise
    execute_from_command_line(sys.argv)

if __name__ == '__main__':
    main()
