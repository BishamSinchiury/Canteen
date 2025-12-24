from django.db import models
from django.conf import settings


class AuditLog(models.Model):
    who = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL)
    when = models.DateTimeField(auto_now_add=True)
    action = models.CharField(max_length=50)
    model = models.CharField(max_length=100)
    previous_data = models.JSONField(null=True, blank=True)
    new_data = models.JSONField(null=True, blank=True)

    def __str__(self):
        return f"{self.when} {self.who} {self.action} {self.model}"
