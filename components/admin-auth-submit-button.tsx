"use client";

type AdminAuthSubmitButtonProps = {
  label: string;
  confirmMessage?: string;
  className?: string;
};

export function AdminAuthSubmitButton({
  label,
  confirmMessage,
  className = "",
}: AdminAuthSubmitButtonProps) {
  return (
    <button
      type="submit"
      onClick={(event) => {
        const form = event.currentTarget.form;

        if (!form) {
          return;
        }

        const usernameField = form.querySelector<HTMLInputElement>('input[name="adminUsername"]');
        const passwordField = form.querySelector<HTMLInputElement>('input[name="adminPassword"]');

        if (!usernameField || !passwordField) {
          event.preventDefault();
          window.alert("Missing admin fields.");
          return;
        }

        const username = window.prompt("Admin username");
        if (!username) {
          event.preventDefault();
          return;
        }
        usernameField.value = username;

        const password = window.prompt("Admin password");
        if (!password) {
          event.preventDefault();
          return;
        }
        passwordField.value = password;

        if (confirmMessage && !window.confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
      className={className}
    >
      {label}
    </button>
  );
}
