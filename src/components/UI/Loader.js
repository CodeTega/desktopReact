import React from "react";
import { Watch } from "react-loader-spinner";
import Modal from "@mui/material/Modal";

const Loader = ({ open }) => (
  <Modal
    open={open}
    aria-labelledby="modal-modal-title"
    aria-describedby="modal-modal-description"
  >
    <div className="top-1/2 left-1/2 absoulte ">
      <Watch
        height="100"
        width="100"
        radius="48"
        color="#4fa94d"
        ariaLabel="watch-loading"
        wrapperStyle={{
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          position: "absolute",
          borderRadius: "50px",
        }}
        wrapperClassName=""
        visible={true}
      />
    </div>
  </Modal>
);

export default Loader;
