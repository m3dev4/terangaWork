from django.db import models
from django.contrib.auth.models import AbstractUser, BaseUserManager


class UserRole(models.TextChoices):
    FREELANCE = "freelance", "Freelance"
    ANNONCEUR = "annonceur", "Annonceur"


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("L'email doit être fourni")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Le superutilisateur doit avoir is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Le superutilisateur doit avoir is_superuser=True.")

        return self.create_user(email, password, **extra_fields)


class User(AbstractUser):
    username = None
    first_name = models.CharField(max_length=30, blank=False, null=False)
    last_name = models.CharField(max_length=30, blank=False, null=False)
    email = models.EmailField(unique=True, blank=False, null=False)
    password = models.CharField(max_length=64, blank=False, null=False)
    number_phone = models.CharField(max_length=15, blank=False, null=False)
    profile_picture = models.ImageField(
        upload_to="profile_pictures/", blank=True, null=True
    )
    onboarding_completed = models.BooleanField(default=False)
    onboarding_step = models.CharField(max_length=50, default="identite")
    is_verified = models.BooleanField(default=False)
    googleId = models.CharField(max_length=255, blank=True, null=True)
    role = models.CharField(
        max_length=20,
        choices=UserRole.choices,
        null=True,
        blank=True,
    )

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []
    objects = UserManager()

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.email})"

    def save(self, *args, **kwargs):
        """Empêche toute modification du rôle après sa première attribution."""
        if self.pk:
            previous_role = (
                type(self)
                .objects.filter(pk=self.pk)
                .values_list("role", flat=True)
                .first()
            )
            if previous_role and self.role != previous_role:
                raise ValueError("Le rôle d'un utilisateur ne peut pas être modifié.")
        super().save(*args, **kwargs)


class optCode(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    code = models.CharField(max_length=6)
    date_created = models.DateTimeField(auto_now_add=True)
    code_expiration = models.DateTimeField()
    is_used = models.BooleanField(default=False)

    def __str__(self):
        return f"Code: {self.code} for User: {self.user.email}"


class session(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    token = models.CharField(max_length=255)
    location = models.CharField(max_length=255, blank=True, null=True)
    device = models.CharField(max_length=255, blank=True, null=True)
    is_active = models.BooleanField(default=True)
    date_created = models.DateTimeField(auto_now_add=True)
    date_last_used = models.DateTimeField(auto_now=True)
    token_expiration = models.DateTimeField()

    def __str__(self):
        return f"Session for User: {self.user.email} - Token: {self.token}"


class SignalementStatus(models.TextChoices):
    PENDING = "PENDING", "En attente"
    RESOLVED = "RESOLVED", "Résolu"
    DISMISSED = "DISMISSED", "Rejeté"


class SignalementCategory(models.TextChoices):
    SPAM = "SPAM", "Spam / Publicité"
    FRAUD = "FRAUD", "Comportement suspect ou Fraude"
    INAPPROPRIATE = "INAPPROPRIATE", "Contenu inapproprié"
    NON_RESPECT = "NON_RESPECT", "Non respect des règles / Délais"
    AUTRE = "AUTRE", "Autre motif"


class Signalement(models.Model):
    reporter = models.ForeignKey(User, on_delete=models.CASCADE, related_name="reports_made")
    reported_user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="reports_received")
    mission = models.ForeignKey("mission.Mission", on_delete=models.SET_NULL, null=True, blank=True, related_name="signalements")
    category = models.CharField(max_length=50, choices=SignalementCategory.choices, default=SignalementCategory.AUTRE)
    reason = models.TextField()
    status = models.CharField(max_length=20, choices=SignalementStatus.choices, default=SignalementStatus.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Signalement #{self.id} - {self.category} ({self.status})"

