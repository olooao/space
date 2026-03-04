/**
 * apiClient.js — Axios instance pre-configured with base URL.
 * Use this instead of raw axios throughout the app.
 */
import axios from "axios";
import { API_BASE_URL } from "../config/api";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

export default apiClient;
