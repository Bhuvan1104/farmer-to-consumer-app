from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("orders", "0006_alter_order_status"),
    ]

    operations = [
        migrations.AddField(
            model_name="order",
            name="delivery_address",
            field=models.TextField(blank=True, default=""),
        ),
    ]
