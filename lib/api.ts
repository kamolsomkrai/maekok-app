//lib/api.ts
// axios instance (ปรับ baseURL ให้เป็น IP เต็ม แล้ว include credentials)
import axios from "axios";

export const api = axios.create({
  baseURL: "/api", // ใช้ URL เต็มเพื่อให้ cookie domain ตรงกัน
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});
