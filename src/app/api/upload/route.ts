// src/app/api/upload/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase'; // Ensure this is your Supabase client

/**
 * Handles POST requests to process file uploads.
 * @param {Request} request The incoming request object.
 * @returns {NextResponse} A JSON response indicating the status of the upload.
 */
export async function POST(request: Request) {
  try {
    // 1. Parse the incoming form data from the request
    const formData = await request.formData();
    const files = formData.getAll('files'); // 'files' should match the name attribute in your client-side form data

    if (!files || files.length === 0) {
      return NextResponse.json({ success: false, message: "No files were uploaded." }, { status: 400 });
    }

    const processedFiles = [];

    // 2. Process each file
    for (const file of files) {
      if (file instanceof Blob) {
        // Upload the file to Supabase Storage
        const { data, error: uploadError } = await supabase.storage
          .from('chat-files') // Your Supabase bucket name
          .upload(`chat-files/${file.name}`, file);

        if (uploadError) {
          console.error("File upload error:", uploadError.message);
          return NextResponse.json({ success: false, message: "Failed to upload file." }, { status: 500 });
        }

        // Get the public URL of the uploaded file
        const { data: fileData } = supabase.storage
          .from('chat-files')
          .getPublicUrl(data.path);  // Accessing the public URL directly

        // Check if publicUrl is available
        const publicURL = fileData?.publicUrl; // fileData contains the public URL

        if (!publicURL) {
          console.error("Error getting file URL");
          return NextResponse.json({ success: false, message: "Failed to get file URL." }, { status: 500 });
        }

        // 3. Insert file metadata into the database
        const { data: fileMetadata, error: fileError } = await supabase
          .from('files')
          .insert([
            {
              file_name: file.name,
              file_url: publicURL,  // URL to access the uploaded file
              file_type: file.type,
              file_size: file.size,
              chat_session_id: 'your-chat-session-id',  // Replace with the actual chat session ID
              user_id: 'your-user-id',  // Replace with the actual user ID (if applicable)
            }
          ]);

        if (fileError) {
          console.error("Error inserting file metadata into DB:", fileError.message);
          return NextResponse.json({ success: false, message: "Failed to store file metadata." }, { status: 500 });
        }

        // Log the processed file metadata
        processedFiles.push({
          fileName: file.name,
          fileUrl: publicURL,
          fileType: file.type,
          fileSize: file.size,
        });

        // Log details about the file
        console.log(`Received file: ${file.name}, Type: ${file.type}, Size: ${file.size} bytes`);
      }
    }

    // 4. Return a success response with the processed file details
    return NextResponse.json({
      success: true,
      message: "Files processed successfully.",
      uploadedFiles: processedFiles
    }, { status: 200 });

  } catch (error: any) {
    console.error("File upload error:", error);
    return NextResponse.json({ success: false, message: "Internal Server Error." }, { status: 500 });
  }
}
