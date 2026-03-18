from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0005_user_dispatch_coordinates_address_coordinates"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="preferred_language",
            field=models.CharField(
                choices=[("en", "English"), ("hi", "Hindi"), ("te", "Telugu"), ("ta", "Tamil")],
                default="en",
                max_length=8,
            ),
        ),
        migrations.CreateModel(
            name="ChatMessage",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("source_text", models.TextField()),
                ("source_language", models.CharField(default="en", max_length=8)),
                ("translated_text", models.TextField(blank=True, default="")),
                ("translated_language", models.CharField(default="en", max_length=8)),
                ("is_read", models.BooleanField(default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "receiver",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="received_messages",
                        to="users.user",
                    ),
                ),
                (
                    "sender",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="sent_messages",
                        to="users.user",
                    ),
                ),
            ],
            options={"ordering": ["created_at"]},
        ),
    ]
