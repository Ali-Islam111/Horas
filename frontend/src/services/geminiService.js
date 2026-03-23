import { GoogleGenerativeAI } from '@google/generative-ai'
import mammoth from 'mammoth'
import * as pdfjsLib from 'pdfjs-dist'

// Configure PDF.js worker to use CDN to avoid build issues in Vite
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`

/**
 * Extracts text from a File object (PDF, DOCX, TXT)
 */
async function extractTextFromFile(file) {
    const fileExtension = file.name.split('.').pop().toLowerCase()

    if (fileExtension === 'txt') {
        return await file.text()
    } else if (fileExtension === 'docx') {
        const arrayBuffer = await file.arrayBuffer()
        const result = await mammoth.extractRawText({ arrayBuffer })
        return result.value
    } else if (fileExtension === 'pdf') {
        const arrayBuffer = await file.arrayBuffer()
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

        let fullText = ''
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i)
            const textContent = await page.getTextContent()
            const pageText = textContent.items.map(item => item.str).join(' ')
            fullText += pageText + '\n'
        }
        return fullText
    } else {
        throw new Error('Unsupported file format. Please upload PDF, DOCX, or TXT.')
    }
}

/**
 * Parses a file and extracts questions using Google Gemini API
 */
export async function parseExamFileWithGemini(file, apiKey) {
    if (!apiKey) {
        throw new Error('Google Gemini API Key is required.')
    }

    // 1. Extract raw text from file
    const extractedText = await extractTextFromFile(file)

    if (!extractedText.trim()) {
        throw new Error('Could not extract any text from the file. It might be empty or scanned.')
    }

    // 2. Initialize Gemini AI
    const genAI = new GoogleGenerativeAI(apiKey)
    // Use gemini-1.5-flash as it is fast and excellent at reasoning tasks
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    // 3. Prepare the prompt to enforce strict JSON structure
    const prompt = `
You are an expert exam generator. Extract all multiple choice (mcq) and true/false (tf) questions from the provided text.
If no explicit questions are found, generate 5-10 relevant questions based on the document's content.

Return the output EXACTLY as a raw JSON array of objects. DO NOT wrap the JSON in Markdown blocks (like \`\`\`json). Just the raw array starting with [ and ending with ].

Each valid question object MUST have the following properties:
- "id": A unique string ID (e.g., "q1", "q2").
- "type": Either "mcq" or "tf".
- "text": The full text of the question.
- "marks": A number representing the marks (default to 1 or 2).
- "options": An array of string options. For "mcq", usually 4 options. For "tf", exactly ["True", "False"] or ["صح", "خطأ"] depending on language.
- "correctAnswer": The exact string of the correct option.

Here is the document text to process:
---
${extractedText.substring(0, 30000)} // Limiting to ~30k chars to avoid token limits just in case
---
`

    // 4. Generate content
    const result = await model.generateContent(prompt)
    const responseText = result.response.text()

    // 5. Clean up any potential markdown syntax from the response
    const cleanedText = responseText.replace(/```json/g, '').replace(/```/g, '').trim()

    // 6. Parse and validate JSON
    try {
        const questions = JSON.parse(cleanedText)
        if (!Array.isArray(questions)) {
            throw new Error('AI did not return an array.')
        }

        // Add default IDs if missing to fit the frontend architecture
        return questions.map((q, index) => ({
            ...q,
            id: q.id || `ai-gen-${Date.now()}-${index}`,
            marks: q.marks || 1
        }))
    } catch (err) {
        console.error('Failed to parse Gemini JSON:', responseText)
        throw new Error('Failed to parse AI response into structured format. Please try again.')
    }
}
