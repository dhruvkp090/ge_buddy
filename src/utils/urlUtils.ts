export const formatUrl = (url: string): string | null => {
  try {
    // Add protocol if missing
    const urlWithProtocol = url.startsWith("http") ? url : `https://${url}`;
    const urlObject = new URL(urlWithProtocol);

    // Get just the origin (protocol + hostname)
    return urlObject.origin;
  } catch (error) {
    return null;
  }
};

export const getDomain = (url: string): string | null => {
  try {
    // Add protocol if missing
    const urlWithProtocol = url.startsWith("http") ? url : `https://${url}`;
    const urlObject = new URL(urlWithProtocol);

    // Return just the hostname (domain)
    return urlObject.hostname.replace(/^www\./, "");
  } catch (error) {
    return null;
  }
};

export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url.startsWith("http") ? url : `https://${url}`);
    return true;
  } catch (error) {
    return false;
  }
};

export const verifyWebsite = async (url: string): Promise<boolean> => {
  try {
    // Instead of making a request, just validate the URL format
    const urlObject = new URL(url.startsWith("http") ? url : `https://${url}`);
    return urlObject.hostname.length > 0;
  } catch (error) {
    return false;
  }
};
