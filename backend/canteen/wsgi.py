import os
from pathlib import Path
from django.core.wsgi import get_wsgi_application

# Load .env file
try:
    import dotenv
    # Look for .env file in the parent directory of wsgi.py (which is canteen/), so we need to go up one more level to backend/
    # wsgi.py is in backend/canteen/wsgi.py. .env is in backend/.env
    env_path = Path(__file__).resolve().parent.parent / '.env'
    dotenv.load_dotenv(env_path)
except ImportError:
    pass

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "canteen.settings")
application = get_wsgi_application()
