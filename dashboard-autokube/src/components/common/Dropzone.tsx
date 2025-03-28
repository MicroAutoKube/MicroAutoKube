import { useDropzone } from "react-dropzone";



interface DropzoneProps {
    onFileAccepted: (file: File) => void;
    currentFile: File | null;
}

const Dropzone = ({ onFileAccepted, currentFile }: DropzoneProps) => {
    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        multiple: false,
        onDrop: (acceptedFiles) => {
            if (acceptedFiles && acceptedFiles.length > 0) {
                const file = acceptedFiles[0];

                // เช็กชื่อไฟล์ว่า "ดูแล้วเหมือน SSH key"
                const allowed = /\.(pem|key|priv|txt)$/i.test(file.name) || !file.name.includes(".");

                if (!allowed) {
                    console.warn("❌ Invalid file type:", file.name);
                    return;
                }

                console.log("📁 File dropped:", file);
                onFileAccepted(file);
            } else {
                console.warn("⚠️ No valid file dropped.");
            }
        },
    });

    return (
        <div
            {...getRootProps()}
            className={`w-full p-4 mt-2 rounded border-2 ${isDragActive ? "border-blue-400" : "border-gray-700"
                } border-dashed bg-gray-800 text-white text-center cursor-pointer`}
        >
            <input {...getInputProps()} />
            {currentFile ? (
                <p className="text-green-400">{currentFile.name}</p>
            ) : (
                <p>Drag & drop SSH key here, or click to select file</p>
            )}
        </div>
    );
};



export default Dropzone;