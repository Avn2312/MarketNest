export const getCloudinaryPublicId = (url) => {
    if (!url || typeof url !== "string") return null;
    try {
        const uploadIndex = url.indexOf("/upload/");
        if (uploadIndex === -1) {
            return url.split("/").pop().split(".")[0];
        }

        let pathAfterUpload = url.substring(uploadIndex + 8);
        pathAfterUpload = pathAfterUpload.replace(/^v\d+\//, "");

        const lastDotIndex = pathAfterUpload.lastIndexOf(".");
        if (lastDotIndex !== -1) {
            pathAfterUpload = pathAfterUpload.substring(0, lastDotIndex);
        }

        return pathAfterUpload;
    } catch {
        return url.split("/").pop().split(".")[0];
    }
};
