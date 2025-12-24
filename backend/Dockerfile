FROM python:3.11-slim
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
WORKDIR /app
COPY ./requirements.txt /app/requirements.txt
RUN pip install --upgrade pip && pip install -r /app/requirements.txt
COPY . /app
RUN mkdir -p /var/log/gunicorn /vol/static /vol/media
ENV PYTHONUNBUFFERED=1
ENV DJANGO_SETTINGS_MODULE=canteen.settings
RUN python manage.py collectstatic --noinput || true
CMD ["gunicorn", "-c", "gunicorn.conf.py", "canteen.wsgi:application"]