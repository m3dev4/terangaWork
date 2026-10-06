from django.db import models


class educationRole(models.TextChoices):
    UNIVERSITAIRE = "UNIVERSITAIRE", "Universitaire"
    FORMATION_PROFESSIONNELLE = "FORMATION_PROFESSIONNELLE", "Formation professionnelle"
    EN_LIGNE = "EN_LIGNE", "En ligne"


class Freelancee(models.Model):
    user = models.OneToOneField(
        "User.User", on_delete=models.CASCADE, related_name="freelance"
    )
    title = models.CharField(max_length=100)
    description = models.TextField(max_length=5000)
    githubUrl = models.CharField(max_length=100, blank=True)
    linkedinUrl = models.CharField(max_length=100, blank=True)
    technologies = models.ManyToManyField(
        "Technologie.Technologie",
        blank=True,
        related_name="freelance_profiles",
    )
    services = models.ManyToManyField(
        "Service.Service",
        blank=True,
        related_name="freelances",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Freelance profile of {self.user.first_name} {self.user.last_name}"


class Experience(models.Model):
    freelance = models.ForeignKey(
        Freelancee, on_delete=models.CASCADE, related_name="experiences"
    )
    entreprise = models.CharField(max_length=100)
    poste = models.CharField(max_length=100)
    startDate = models.DateField()
    endDate = models.DateField(null=True, blank=True)
    current = models.BooleanField(default=False)
    description = models.TextField(max_length=5000, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if self.current:
            Experience.objects.filter(freelance=self.freelance, current=True).update(
                current=False
            )
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.entreprise} - {self.poste}"


class Realisation(models.Model):
    freelance = models.ForeignKey(
        Freelancee, on_delete=models.CASCADE, related_name="realisations"
    )
    title = models.CharField(max_length=100)
    description = models.TextField(max_length=5000, blank=True, default="")
    link = models.CharField(max_length=100, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} - {self.created_at}"


class Education(models.Model):
    freelance = models.ForeignKey(
        Freelancee, on_delete=models.CASCADE, related_name="educations"
    )
    role = models.CharField(max_length=100, choices=educationRole.choices)
    nom = models.CharField(max_length=100)
    etablissement = models.CharField(max_length=200, blank=True, default="")
    intitule = models.CharField(max_length=200, blank=True, default="")
    date_obtention = models.DateField(null=True, blank=True)
    lien_verification = models.URLField(max_length=500, blank=True, default="")
    startDate = models.DateField()
    endDate = models.DateField(null=True, blank=True)
    current = models.BooleanField(default=False)
    description = models.TextField(max_length=5000, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if self.current:
            Education.objects.filter(freelance=self.freelance, current=True).update(
                current=False
            )
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.nom} - {self.role}"


class DiplomeObtenu(models.Model):
    linkVerify = models.CharField(max_length=100, blank=True)
    dateObtention = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Diplome Obtenu - {self.created_at}"
