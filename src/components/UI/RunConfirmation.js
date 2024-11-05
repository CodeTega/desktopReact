import React from "react";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

const SweetAlert = withReactContent(Swal);

const RunConfirmation = ({ show, data, onConfirm, onCancel }) => {
  if (show) {
    SweetAlert.fire({
      title: "Are you sure?",
      text: `You are about to delete ${data.Job_Name}. This action cannot be undone.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, run!",
      cancelButtonText: "Cancel",
    }).then((result) => {
      if (result.isConfirmed) {
        onConfirm(data.ID);
      } else {
        onCancel(false);
      }
    });
  }

  return null; // This component does not render anything directly
};

export default RunConfirmation;
