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

        if (!usernameField) {
          event.preventDefault();
          window.alert("Missing admin username field.");
          return;
        }

        const username = window.prompt("Admin username");
        if (!username) {
          event.preventDefault();
          return;
        }
        usernameField.value = username;

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
