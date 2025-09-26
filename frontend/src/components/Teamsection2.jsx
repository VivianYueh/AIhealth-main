import React from "react";
import { useTranslation } from "react-i18next";
import "./TeamSection.css";

export default function TeamSection2() {
  const { t } = useTranslation();

  const group1 = [

    { key: "huang", img: "/public/uploads/member5.jpg" },
  ];

  const group2 = [

  ];

  // 共用的卡片渲染函式
  const renderMembers = (members) =>
    members.map(({ key, img }) => (
      <div key={key} className="col-12 col-sm-6 col-md-3 mb-4 d-flex">
        <div className="card team-card shadow-sm border-0 w-100 h-100">
          <div className="team-img-wrapper">
            <img
              src={img}
              alt={t(`team.members.${key}.name`)}
              className="team-img"
              loading="lazy"
            />
          </div>
          <div className="card-body text-center">
            <h5 className="card-title fw-semibold mb-1">
              {t(`team.members.${key}.name`)}
            </h5>
            <p className="text-primary small mb-2">
              {t(`team.members.${key}.role`)}
            </p>
            <p className="text-muted small mb-0">
              {t(`team.members.${key}.bio`)}
            </p>
          </div>
        </div>
      </div>
    ));

  return (
    <section id="team-section" className="py-5 bg-light border-top fade-up-section">
      <div className="container">

        <div className="row justify-content-center">{renderMembers(group1)}</div>

        <div className="row justify-content-center">{renderMembers(group2)}</div>
      </div>
    </section>
  );
}
