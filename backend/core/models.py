from django.db import models

class Organization(models.Model):
    name = models.CharField(max_length=255, default="EECOHM School")
    address = models.TextField(blank=True, default="Address")
    phone = models.CharField(max_length=50, blank=True)
    email = models.EmailField(blank=True)
    website = models.URLField(blank=True)
    logo = models.ImageField(upload_to='org/', null=True, blank=True)
    
    # Store settings as JSON (e.g. tax rate, currency symbol)
    settings = models.JSONField(default=dict, blank=True)

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        # Ensure only one instance exists
        if not self.pk and Organization.objects.exists():
            raise ValueError('There can be only one Organization instance')
        return super(Organization, self).save(*args, **kwargs)

    @classmethod
    def get_instance(cls):
        obj, created = cls.objects.get_or_create(pk=1)
        return obj
