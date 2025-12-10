// services/gemini.ts
// Production version — calls Firebase Cloud Function instead of Gemini directly.

//
// 1) fileToBase64
// Converts File objects into base64 strings (without data:image/png;base64 prefix)
//
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result as string;

      // Remove "data:image/...;base64," part → Cloud Function expects raw base64
      const base64 = result.split(',')[1];

      resolve(base64);
    };

    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};


//
// 2) processImagesViaFunction
// Sends an array of base64 images & ID Token to Firebase Cloud Function
//
export async function processImagesViaFunction(base64Images: string[], idToken: string) {

  // IMPORTANT: Replace with your deployed region if different
  const FUNCTION_URL = "https://us-central1-esyasil-ai.cloudfunctions.net/processImages";

  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${idToken}`
    },
    body: JSON.stringify({ images: base64Images })
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Backend Hatası: ${message}`);
  }

  const json = await response.json();

  // json structure:
  // {
  //   results: [
  //     { status: "success", data: "<base64>" },
  //     { status: "error", error: "..." },
  //     ...
  //   ]
  // }
  return json;
}
