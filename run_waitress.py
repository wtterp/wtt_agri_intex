from waitress import serve

from app import app
from config import Config

if __name__ == "__main__":
    serve(app, host=Config.HOST, port=Config.PORT, threads=8)
