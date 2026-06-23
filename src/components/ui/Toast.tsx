"use client";

import React from "react";
import { useTreasuryStore } from "../../lib/store";
import { CheckCircle, AlertCircle, Info, X } from "lucide-react";

export default function ToastContainer() {
  const { toasts, removeToast } = useTreasuryStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto flex items-start gap-3 p-4 rounded-xl border glass-panel transition-all duration-300 animate-fade-in shadow-2xl"
          style={{
            borderColor:
              toast.type === "success"
                ? "rgba(16, 185, 129, 0.4)"
                : toast.type === "error"
                ? "rgba(239, 68, 68, 0.4)"
                : "rgba(6, 182, 212, 0.4)",
          }}
        >
          {/* Icons */}
          <div className="mt-0.5">
            {toast.type === "success" && (
              <CheckCircle className="w-5 h-5 text-emerald-400" />
            )}
            {toast.type === "error" && (
              <AlertCircle className="w-5 h-5 text-red-400" />
            )}
            {toast.type === "info" && (
              <Info className="w-5 h-5 text-cyan-400" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1">
            <h4 className="font-semibold text-sm text-gray-100">{toast.title}</h4>
            <p className="text-xs text-gray-400 mt-1 leading-relaxed">
              {toast.description}
            </p>
          </div>

          {/* Close button */}
          <button
            onClick={() => removeToast(toast.id)}
            className="text-gray-500 hover:text-gray-300 p-0.5 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
