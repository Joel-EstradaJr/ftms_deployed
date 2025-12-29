//import Router from "next/router";

export async function logout() {
  // UI-only mode: No API calls to backend
  // Just clear local storage and redirect
  
  // Remove any local tokens (if stored)
  if (typeof window !== "undefined") {
    localStorage.removeItem("jwt");
    sessionStorage.removeItem("jwt");
    // Clear cookies if not HTTP-only
    document.cookie = "jwt=; Max-Age=0; path=/;";
  }

  // Redirect to login page
  window.location.href = "/authentication/login";
}