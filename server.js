const express = require('express');
const cors = require('cors');
const translate = require('google-translate-api-x');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const publicDir = path.join(__dirname, 'public');

app.use((req, res, next) => {
    let reqPath = req.path === '/' ? '/index.html' : req.path;
    let filePath = path.join(publicDir, reqPath);
    
    if (filePath.endsWith('.html') && fs.existsSync(filePath)) {
        let htmlContent = fs.readFileSync(filePath, 'utf-8');
        
        const customScript = `
        <style>
            #google_translate_element { display: none !important; }
            .skiptranslate { display: none !important; }
            body { top: 0px !important; }
            
            #custom_lang_selector {
                padding: 6px 12px;
                border-radius: 6px;
                background: #1e1e2e;
                color: #cdd6f4;
                border: 1px solid #89b4fa;
                font-family: inherit;
                cursor: pointer;
                outline: none;
                transition: border-color 0.2s;
            }
            #custom_lang_selector:hover {
                border-color: #b4befe;
            }
            #translate-loading {
                display: none;
                position: fixed;
                top: 0; left: 0; right: 0; bottom: 0;
                background: rgba(0,0,0,0.7);
                color: white;
                font-size: 24px;
                z-index: 999999;
                align-items: center;
                justify-content: center;
                flex-direction: column;
            }
            .spinner {
                border: 4px solid rgba(255,255,255,0.3);
                border-top: 4px solid white;
                border-radius: 50%;
                width: 40px;
                height: 40px;
                animation: spin 1s linear infinite;
                margin-bottom: 15px;
            }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        </style>
        
        <div id="translate-loading">
            <div class="spinner"></div>
            <span>Translating page... Please wait.</span>
        </div>
        
        <script>
            document.addEventListener('DOMContentLoaded', () => {
                const wrap = document.querySelector('.translate-wrap');
                if (wrap) {
                    wrap.innerHTML += \`<select id="custom_lang_selector">
                        <option value="en">🌐 English</option>
                        <option value="si">සිංහල (Sinhala)</option>
                        <option value="ta">தமிழ் (Tamil)</option>
                    </select>\`;
                    
                    const selector = document.getElementById('custom_lang_selector');
                    
                    const savedLang = localStorage.getItem('appLang');
                    if(savedLang && savedLang !== 'en') {
                        selector.value = savedLang;
                        translatePage(savedLang);
                    }
                    
                    selector.addEventListener('change', async (e) => {
                        const lang = e.target.value;
                        localStorage.setItem('appLang', lang);
                        location.reload(); 
                    });
                }
            });
            
            async function translatePage(lang) {
                const loading = document.getElementById('translate-loading');
                loading.style.display = 'flex';
                
                const textNodes = [];
                const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
                let node;
                while(node = walk.nextNode()) {
                    const parent = node.parentElement;
                    if(parent && parent.tagName !== 'SCRIPT' && parent.tagName !== 'STYLE' && !parent.closest('#custom_lang_selector')) {
                        const trimmed = node.nodeValue.trim();
                        if(trimmed.length > 0 && /[a-zA-Z]/.test(trimmed)) {
                            if (!node.originalText) {
                                node.originalText = node.nodeValue;
                            }
                            textNodes.push(node);
                        }
                    }
                }
                
                const textsToTranslate = textNodes.map(n => n.originalText);
                
                try {
                    const response = await fetch('/api/translate-batch', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ texts: textsToTranslate, targetLang: lang })
                    });
                    
                    const data = await response.json();
                    if(data.translatedTexts) {
                        data.translatedTexts.forEach((translated, index) => {
                            if(translated) {
                                textNodes[index].nodeValue = textNodes[index].originalText.replace(textNodes[index].originalText.trim(), translated.trim());
                            }
                        });
                    }
                } catch(err) {
                    console.error('Translation error', err);
                    alert('Translation failed. Please try again.');
                } finally {
                    loading.style.display = 'none';
                }
            }
        </script>
        `;
        
        htmlContent = htmlContent.replace('</body>', customScript + '</body>');
        res.send(htmlContent);
        return;
    }
    next();
});

app.use(express.static(publicDir));

app.post('/api/translate-batch', async (req, res) => {
    try {
        const { texts, targetLang } = req.body;
        if (!texts || !Array.isArray(texts)) {
            return res.status(400).json({ error: 'Texts array is required' });
        }
        
        let allTranslated = [];
        
        // google-translate-api-x supports array batching natively
        // We will send chunks of 20 to be extremely safe, although it can handle more
        const chunkSize = 20;
        for (let i = 0; i < texts.length; i += chunkSize) {
            const chunk = texts.slice(i, i + chunkSize);
            try {
                const results = await translate(chunk, { to: targetLang || 'si' });
                // If single result is returned instead of array (should not happen with array input, but just in case)
                if (Array.isArray(results)) {
                    allTranslated = allTranslated.concat(results.map(r => r.text));
                } else {
                    allTranslated.push(results.text);
                }
            } catch(e) {
                console.error("Chunk failed:", e.message);
                allTranslated = allTranslated.concat(chunk); // Fallback to english
            }
        }
        
        res.json({ translatedTexts: allTranslated });
    } catch (error) {
        console.error('Batch translation error:', error.message);
        res.status(500).json({ error: 'Translation failed' });
    }
});

// Smart Local Algorithm for Auto Enhance
app.post('/api/enhance', (req, res) => {
    const { persona, task, ctx, audience, tone, instructions, refs } = req.body;
    if (!task) return res.status(400).json({ error: 'Task is required' });

    let enhanced = `[System Meta-Instruction: Act as an elite, world-class expert specializing in the domain required to fulfill the user's request. Execute with maximum precision and depth.]\n\n`;
    
    enhanced += `### 🎭 ASSIGNED EXPERT PERSONA\n`;
    if (persona) {
        enhanced += `Embody the following persona fully: "${persona}". Adopt the mindset, vocabulary, and analytical depth of an elite professional in this field. Do not break character.\n`;
    } else {
        enhanced += `Determine the most optimal expert persona for the task and adopt it completely.\n`;
    }

    enhanced += `\n### 🎯 CORE OBJECTIVE\n`;
    enhanced += `Your absolute primary goal is: "${task}". Execute this with exceptional quality, surpassing standard expectations.\n`;

    if (ctx || audience || tone) {
        enhanced += `\n### 🌍 CONTEXT & ALIGNMENT\n`;
        if (ctx) enhanced += `- **Background Context:** ${ctx}\n`;
        if (audience) enhanced += `- **Target Audience:** ${audience}. Tailor the complexity, phrasing, and structure specifically for them.\n`;
        if (tone) enhanced += `- **Mandatory Tone:** ${tone}. Ensure every sentence reflects this tone perfectly without deviation.\n`;
    }

    if (refs) {
        enhanced += `\n### 📚 REFERENCE MATERIAL\n`;
        enhanced += `Carefully analyze the following reference material. Synthesize its style, key patterns, and structural elements into your final output:\n"${refs}"\n`;
    }

    if (instructions && instructions.length > 0) {
        enhanced += `\n### 🛡️ STRICT EXECUTION RULES\n`;
        enhanced += `You MUST follow these constraints flawlessly. Failure is not an option:\n`;
        instructions.forEach(inst => {
            if (inst.trim()) enhanced += `1. [CRITICAL] ${inst.trim()}\n`;
        });
    }

    enhanced += `\n### 🧠 EXECUTION DIRECTIVE\n`;
    enhanced += `Before writing your final response, take a deep breath. Think step-by-step through the optimal structure. Ensure all constraints are met, and deliver a masterpiece.`;

    res.json({ enhancedPrompt: enhanced });
});

// Smart Local Algorithm for Image Prompt Generation
app.post('/api/generate-image-prompt', (req, res) => {
    const { idea, category } = req.body;
    
    let base = `CREATE AN ULTRA-REALISTIC, HIGH-END PROFESSIONAL PHOTOGRAPH. `;
    if (idea) base += `MAIN CONCEPT: ${idea.toUpperCase()}. `;

    let modifiers = "";
    switch (category) {
        case 'portrait':
            modifiers = `\nASPECT RATIO: Vertical 4:5.\nSUBJECT & IDENTITY: High-end lifestyle portrait. Natural face shape, distinct authentic features, realistic skin texture with visible pores and slight imperfections. No beautification filter, no plastic skin.\nLIGHTING: Soft diffused natural window light, cinematic rim light, gentle highlights on the cheekbones.\nCAMERA: Shot on 85mm portrait lens, f/1.8 aperture, extremely shallow depth of field, sharp focus strictly on the eyes. Optical bokeh background.\nAESTHETIC: Vogue magazine cover quality, photorealistic, 8k resolution, raw photo format.`;
            break;
        case 'beach':
            modifiers = `\nASPECT RATIO: Horizontal 16:9 or Vertical 4:5.\nENVIRONMENT: Beautiful tropical beach shoreline. Crystal clear shallow water, wet reflecting sand, lush green palm trees in the background, bright blue sky with wispy clouds.\nLIGHTING: Golden hour sunset / soft natural daylight, warm sun-kissed highlights, natural bounce light from the sand.\nCAMERA: Shot on 35mm lens, f/2.8, full-frame sensor, sharp environmental focus.\nAESTHETIC: High-end travel photography, National Geographic style, physically accurate water caustics, ultra-photorealistic.`;
            break;
        case 'cinematic':
            modifiers = `\nASPECT RATIO: Widescreen 2.35:1 or 16:9.\nENVIRONMENT: Dark, moody, atmospheric setting. Subtle fog or mist in the air, deep shadows.\nLIGHTING: Dramatic chiaroscuro lighting, strong backlight, neon or warm practical light sources, cinematic color grading (teal and orange), high contrast.\nCAMERA: Arri Alexa 65, anamorphic lens, beautiful horizontal lens flares, cinematic grain, realistic motion blur.\nAESTHETIC: Hollywood blockbuster still, highly detailed, dramatic tension, photorealistic 8k.`;
            break;
        case 'travel':
            modifiers = `\nASPECT RATIO: 4:5 or 16:9.\nENVIRONMENT: Breathtaking landscape or vibrant urban street. Authentic local atmosphere.\nLIGHTING: Bright, vibrant natural daylight, rich colors, realistic shadows.\nCAMERA: 24mm or 50mm lens, deep depth of field capturing the environment beautifully. \nAESTHETIC: Candid, energetic, documentary travel photography, high dynamic range, sharp details.`;
            break;
        case 'night':
            modifiers = `\nASPECT RATIO: 4:5 or 16:9.\nENVIRONMENT: Nighttime scene, dark surroundings, glowing practical lights, wet streets reflecting neon signs.\nLIGHTING: Low-key lighting, strong colorful accents (emerald green, neon pink, or warm yellow), deep black shadows. \nCAMERA: f/1.2 aperture, high ISO analog film look, beautiful glowing bokeh balls in the background.\nAESTHETIC: Moody night photography, cinematic, slightly grainy film texture, ultra-realistic.`;
            break;
        case 'motorcycle':
            modifiers = `\nASPECT RATIO: 4:5 or 16:9.\nENVIRONMENT: Scenic highway, dramatic sunset, or gritty urban street. \nLIGHTING: Hard directional light, chrome reflections, high contrast.\nCAMERA: Low angle perspective, motion blur on the background if moving, sharp focus on the bike.\nAESTHETIC: Adrenaline lifestyle, commercial automotive photography, ultra-realistic 8k.`;
            break;
        case 'collage':
            modifiers = `\nASPECT RATIO: 2:3 Vertical.\nFORMAT: 3x3 Grid Photo Collage. 9 distinct frames combined into one single image.\nSUBJECT: Consistent identity across all 9 frames but different candid poses in each frame.\nLIGHTING: Beautiful natural outdoor daylight.\nCAMERA: DSLR portrait photography.\nAESTHETIC: Cheerful, lifestyle photoshoot, high-end professional.`;
            break;
        default:
            modifiers = `\nASPECT RATIO: 16:9.\nLIGHTING: Studio-quality balanced lighting.\nCAMERA: DSLR, sharp focus, highly detailed.\nAESTHETIC: Masterpiece, ultra-realistic, 8k resolution.`;
    }

    const finalPrompt = base + modifiers + `\n\nSTRICT NEGATIVE PROMPT: cartoon, illustration, painting, 3d render, CGI, unrealistic proportions, extra limbs, bad anatomy, distorted faces, plastic skin, oversaturated, watermark, text.`;

    res.json({ imagePrompt: finalPrompt });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
