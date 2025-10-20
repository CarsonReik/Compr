import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(request: NextRequest) {
  try {
    const { imageUrl } = await request.json();

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Image URL is required' },
        { status: 400 }
      );
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    console.log('Analyzing image with OpenAI Vision...');

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an expert at analyzing product images for online marketplace listings. Extract as much information as possible about the item in the image. Return ONLY a valid JSON object with these fields (use null if unsure):
{
  "title": "concise product title (max 80 chars)",
  "description": "detailed description mentioning condition, features, and flaws",
  "brand": "brand name",
  "category": "product category",
  "size": "size if visible",
  "color": "primary color",
  "material": "material if identifiable",
  "condition": "new|like_new|good|fair|poor",
  "tags": ["tag1", "tag2", "tag3"]
}`,
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Analyze this product image and extract all relevant information for a marketplace listing. Focus on accuracy and detail.',
            },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl,
                detail: 'high'
              },
            },
          ],
        },
      ],
      max_tokens: 500,
      temperature: 0.3,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    console.log('Raw AI response:', content);

    // Parse the JSON response
    let analysisData;
    try {
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/```\n?([\s\S]*?)\n?```/);
      const jsonString = jsonMatch ? jsonMatch[1] : content;
      analysisData = JSON.parse(jsonString.trim());
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', content);
      throw new Error('Invalid JSON response from AI');
    }

    console.log('Parsed analysis data:', analysisData);

    return NextResponse.json({
      success: true,
      data: analysisData,
    });
  } catch (error: any) {
    console.error('Image analysis error:', error);
    return NextResponse.json(
      {
        error: 'Failed to analyze image',
        details: error.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}
