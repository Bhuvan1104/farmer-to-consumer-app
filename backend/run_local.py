import os
from wsgiref.simple_server import make_server

from django.core.wsgi import get_wsgi_application


def main():
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
    app = get_wsgi_application()

    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", "8000"))

    print(f"Starting stable local server at http://{host}:{port}/")
    print("Press CTRL+C to stop.")

    with make_server(host, port, app) as server:
        server.serve_forever()


if __name__ == "__main__":
    main()
