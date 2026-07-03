"use client";

type ConfirmSubmitButtonProps = {
  label: string;
  message: string;
  className?: string;
};

export function ConfirmSubmitButton({
  label,
  message,
  className = "",
}: ConfirmSubmitButtonProps) {
  return (
    <button
      type="submit"
      onClick={(event) => {
        if (!window.confirm(message)) {
          event.preventDefault();
        }
      }}
      className={className}
    >
      {label}
    </button>
  );
}
