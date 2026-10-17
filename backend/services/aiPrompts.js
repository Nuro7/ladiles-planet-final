const BRIDE_IMAGE_GEN_PROMPT = `
Using the provided VTON output image as the base, ENHANCE it into a high-end cinematic bridal portrait.

[STRICT PRESERVATION RULE]:
You must preserve the bridal dress exactly as shown in the VTON reference image. Do not redesign, reinterpret, recolor, or modify the dress in any way. Every embroidery pattern, border, stitch, pleat, fold, fabric texture, and silhouette must remain unchanged at a pixel-accurate level.

The bride must be the exact same woman as in the reference image. Facial structure, skin tone, eye shape, nose, lips, hairstyle, age, body proportions, and overall identity must remain identical with absolute character consistency.

Your task is enhancement only:
Improve lighting, clarity, sharpness, realism, and depth
Enhance fabric realism without altering design
Enhance skin realism without smoothing or beautification artifacts

The bride wears the specific bridal dress from the VTON image. Jewelry must remain elegant and minimal, including delicate earrings, a thin necklace, and light bangles, integrated naturally with the dress and never overpowering it.

Makeup must remain minimal and natural:
Realistic skin texture
Soft bridal glow
Subtle eye makeup and natural lip tone
No contour exaggeration or artificial smoothing

Lighting should be cinematic and soft, highlighting existing dress embroidery and jewelry details. Maintain natural skin tones. The background must remain elegant, minimal, and softly defocused to keep full attention on the bride.

Style: Ultra-realistic, premium bridal photography
Primary Focus: Dress preservation, fabric realism, ornaments, identity accuracy
Aspect Ratio: 16:9
Quality: Photorealistic, high-resolution wedding portrait

Negative Prompt:
Altered dress design, changed embroidery, modified saree color, fabric hallucination, identity change, facial distortion, plastic skin, heavy makeup, exaggerated jewelry, warped hands, artificial lighting, stylized or cartoon look.
`;

const BRIDE_ONLY_PROMPT = `
ANIMATE the provided VTON-enhanced bride reference image. Treat the reference image as the absolute starting frame (Frame 0).

The bride’s facial features, skin tone, hairstyle, body proportions, and overall identity must remain identical to the reference image across all frames. No visual drift, morphing, or identity deviation is allowed.

The bridal outfit shown in the reference image must remain unchanged throughout the video. Do not redesign, recolor, reinterpret, or modify the dress. Saree drapes, pleats, embroidery, borders, and fabric texture must stay consistent, moving only according to realistic cloth physics.

Scene:
Luxury indoor wedding stage with soft pastel florals, elegant drapes, and warm golden ambient lighting. Background detail should remain subtle and softly defocused to keep focus on the bride.

Motion:
The bride performs a slow, graceful rotation, followed by a gentle forward walk. Movements must be smooth, controlled, realistic, and emotionally serene. Fabric motion must be natural with no stiffness or floating artifacts.

Camera:
Begin with a wide establishing view, transition into a slow orbital camera movement, and finish with a medium-to-close framing. Camera motion must be stable, smooth, and cinematic.

Lighting:
Warm, soft wedding lighting with a subtle glow. Shallow depth of field. Natural skin tones without over-processing.

Aspect Ratio: 16:9
Video Quality: High-resolution cinematic clarity

Negative Prompt:
Dress morphing, altered embroidery, pattern shimmer, identity drift, facial distortion, plastic skin, unnatural movement, floating fabric, shaky camera, flicker, blurred face, warped hands.
`;


const BRIDE_AND_GROOM_PROMPT = `
ANIMATE the provided VTON-enhanced bride reference image into a cinematic wedding stage video. Treat the reference image as the absolute starting frame.

The bride’s identity must remain locked to the reference image with no changes to facial structure, skin tone, hairstyle, or body proportions. The bridal dress must remain exactly as shown in the VTON output, with no design or texture alterations.

Scene:
Luxury indoor wedding stage with pastel florals, elegant drapes, warm golden ambient lighting, and subtle decorative lights. Background remains softly defocused.

The bride remains the primary visual focus, wearing the preserved bridal saree with minimal makeup and elegant jewelry.

Add a groom beside the bride, wearing a classic black suit with a white shirt. The groom should appear calm, confident, and supportive, positioned slightly angled toward the bride without overpowering her presence.

Motion:
The bride performs a slow rotation followed by a gentle forward walk. The groom subtly adjusts posture and turns naturally. Movements must remain smooth, realistic, and emotionally calm.

Camera:
Wide establishing shot, slow orbital movement around the couple, finishing with a medium-to-close framing. Camera must remain stable and cinematic.

Lighting:
Warm, soft lighting, subtle glow on the bride, shallow depth of field, natural skin tones.

Aspect Ratio: 16:9
Quality: High-resolution cinematic clarity

Negative Prompt:
Identity drift, altered dress design, fabric shimmer, exaggerated makeup, heavy jewelry, unnatural movement, shaky camera, flicker, blurred faces, warped hands.
`;

const BRIDE_AND_GROOM_IMAGE_GEN_PROMPT = `
Using the provided VTON bridal image as the base, ENHANCE it into a high-end cinematic portrait of a bride and groom.

The bride must remain identical to the reference image with absolute identity consistency. The bridal dress must remain unchanged, preserving all embroidery, fabric structure, borders, and drape exactly as shown in the VTON output.

Add a groom standing beside the bride, wearing a well-fitted black suit with a white shirt. The groom should appear refined, calm, and complementary to the bride.

Enhancement only:
Improve lighting, depth, sharpness, and realism
Enhance fabric and jewelry realism without altering design
Maintain natural skin texture and tones

Styling:
Minimal, natural makeup for the bride
Elegant, tasteful jewelry
Romantic, premium wedding atmosphere

Style: Ultra-realistic cinematic wedding photography
Aspect Ratio: 16:9
Quality: High-resolution, clean, professional finish

Negative Prompt:
Dress alteration, embroidery loss, identity change, facial distortion, plastic skin, heavy makeup, exaggerated jewelry, warped hands, artificial or stylized appearance.
`;


module.exports = {
    BRIDE_ONLY_PROMPT,
    BRIDE_AND_GROOM_PROMPT,
    BRIDE_IMAGE_GEN_PROMPT,
    BRIDE_AND_GROOM_IMAGE_GEN_PROMPT
};
