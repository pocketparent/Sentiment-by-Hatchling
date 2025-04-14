import boto3
import uuid
import os
from botocore.exceptions import NoCredentialsError

def upload_media_to_s3(file, file_type="image/jpeg"):
    s3 = boto3.client(
        "s3",
        aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
        aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
        region_name=os.getenv("AWS_REGION")
    )
    
    bucket_name = os.getenv("S3_BUCKET_NAME")
    file_extension = file.filename.split(".")[-1]
    unique_filename = f"{uuid.uuid4()}.{file_extension}"
    upload_path = f"uploads/{unique_filename}"

    try:
        s3.upload_fileobj(
            file,
            bucket_name,
            upload_path,
            ExtraArgs={"ContentType": file_type}
        )

        # Generate a signed URL
        signed_url = s3.generate_presigned_url(
            "get_object",
            Params={"Bucket": bucket_name, "Key": upload_path},
            ExpiresIn=3600  # 1 hour
        )
        return signed_url
    except NoCredentialsError:
        raise Exception("AWS credentials not configured correctly.")
