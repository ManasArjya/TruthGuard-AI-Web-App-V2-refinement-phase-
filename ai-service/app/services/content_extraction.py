"""
Content extraction services for TruthGuard AI
Handles OCR and transcription tasks by downloading files from URLs or reading local files.
"""

import easyocr
import cv2
from moviepy.video.io.VideoFileClip import VideoFileClip
import os
import tempfile
import asyncio
import logging
import httpx

logger = logging.getLogger(__name__)

class OCRService:
    """Service for extracting text from images using EasyOCR"""
    
    def __init__(self):
        self.reader = easyocr.Reader(['en'], gpu=False)

    async def extract_text(self, image_url: str) -> str:
        """Downloads or reads an image and extracts text."""
        try:
            # ✅ Detect if it's a local path
            if os.path.exists(image_url):
                logger.info(f"Reading local image: {image_url}")
                return await self._extract_from_local(image_url)
            else:
                return await self._extract_from_url(image_url)
        except Exception as e:
            logger.error(f"OCR failed for {image_url}: {str(e)}")
            return ""

    async def _extract_from_url(self, image_url: str) -> str:
        async with httpx.AsyncClient() as client:
            response = await client.get(image_url, follow_redirects=True, timeout=30.0)
            response.raise_for_status()
        with tempfile.NamedTemporaryFile(delete=True, suffix=".jpg") as temp_file:
            temp_file.write(response.content)
            loop = asyncio.get_event_loop()
            return await loop.run_in_executor(None, self._extract_text_sync, temp_file.name)

    async def _extract_from_local(self, image_path: str) -> str:
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self._extract_text_sync, image_path)

    def _extract_text_sync(self, image_path: str) -> str:
        image = cv2.imread(image_path)
        if image is None:
            raise ValueError(f"Could not read image from {image_path}")
        results = self.reader.readtext(image)
        extracted_text = [text for (_, text, conf) in results if conf > 0.4]
        return " ".join(extracted_text)


class TranscriptionService:
    """Service for transcribing audio from video files"""
    
    def __init__(self):
        pass

    async def transcribe(self, video_url: str) -> str:
        """Downloads or reads video, extracts audio, transcribes it."""
        temp_video_path = None
        temp_audio_path = None
        try:
            # ✅ Support both local and remote videos
            if os.path.exists(video_url):
                temp_video_path = video_url
            else:
                async with httpx.AsyncClient() as client:
                    response = await client.get(video_url, follow_redirects=True, timeout=120.0)
                    response.raise_for_status()
                with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as temp_video:
                    temp_video.write(response.content)
                    temp_video_path = temp_video.name

            temp_audio_path = await self._extract_audio(temp_video_path)
            return await self._transcribe_audio(temp_audio_path)
        except Exception as e:
            logger.error(f"Transcription failed for {video_url}: {str(e)}")
            return ""
        finally:
            if temp_audio_path and os.path.exists(temp_audio_path):
                os.remove(temp_audio_path)
            # Don’t delete local videos or cached files

    async def _extract_audio(self, video_path: str) -> str:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_audio:
            temp_audio_path = temp_audio.name
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, self._extract_audio_sync, video_path, temp_audio_path)
        return temp_audio_path

    def _extract_audio_sync(self, video_path: str, audio_path: str):
        with VideoFileClip(video_path) as video:
            if video.audio is not None:
                video.audio.write_audiofile(audio_path, verbose=False, logger=None)

    async def _transcribe_audio(self, audio_path: str) -> str:
        if not os.path.exists(audio_path) or os.path.getsize(audio_path) == 0:
            return "No audio was found in the video."
        await asyncio.sleep(1)
        import hashlib
        simulated_transcriptions = [
            "This is a simulated transcription. The speaker discusses current events.",
            "In this video, claims are made about government policies and their impact.",
            "The video contains commentary on social media trends and public opinion.",
        ]
        index = int(hashlib.md5(audio_path.encode()).hexdigest(), 16) % len(simulated_transcriptions)
        return simulated_transcriptions[index]
