import asyncio
import os
import cv2
import numpy as np
from app.services.content_extraction import OCRService, TranscriptionService

async def main():
    print("🚀 Starting content extraction tests...\n")

    # ✅ Create local test folder
    os.makedirs("test_data", exist_ok=True)

    # ✅ Create a test image with text ("Hello TruthGuard")
    image_path = "test_data/test_image.png"
    if not os.path.exists(image_path):
        print("🖼️ Creating test image...")
        img = np.ones((200, 600, 3), dtype=np.uint8) * 255
        cv2.putText(img, "Hello TruthGuard", (40, 120), cv2.FONT_HERSHEY_SIMPLEX, 1.8, (0, 0, 0), 3)
        cv2.imwrite(image_path, img)

    # ✅ Create a tiny test video (silent)
    video_path = "test_data/test_video.mp4"
    if not os.path.exists(video_path):
        print("🎞️ Creating test video...")
        fourcc = cv2.VideoWriter_fourcc(*"mp4v")
        out = cv2.VideoWriter(video_path, fourcc, 5, (320, 240))
        for _ in range(10):
            frame = np.ones((240, 320, 3), dtype=np.uint8) * np.random.randint(0, 255, (1, 3))
            out.write(frame)
        out.release()

    # ✅ Run OCR Test
    print("\n🔍 Testing OCRService...")
    ocr = OCRService()
    text = await ocr.extract_text(image_path)
    if text:
        print(f"✅ OCR extracted text: {text}")
    else:
        print("⚠️ OCR returned no text. Check EasyOCR installation.")

    # ✅ Run Transcription Test
    print("\n🎧 Testing TranscriptionService...")
    transcriber = TranscriptionService()
    transcription = await transcriber.transcribe(video_path)
    if transcription:
        print(f"✅ Transcription result: {transcription}")
    else:
        print("⚠️ Transcription returned no text. Check ffmpeg/moviepy setup.")

    print("\n✅ All tests completed.")

if __name__ == "__main__":
    asyncio.run(main())

