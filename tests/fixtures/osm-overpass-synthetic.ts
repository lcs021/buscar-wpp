export const fixture = {
  elements: [
    {
      type: "node",
      id: 901001,
      tags: {
        name: "Clínica Veterinária Sintética A",
        amenity: "veterinary",
        website: "https://clinic-a.example/",
        phone: "+55 11 99999-0001",
      },
    },
    {
      type: "way",
      id: 901002,
      tags: {
        name: "Clínica Veterinária Sintética B",
        amenity: "veterinary",
        "contact:email": "private@example.invalid",
      },
    },
    {
      type: "relation",
      id: 901003,
      tags: {
        name: "Clínica Veterinária Sintética C",
        amenity: "veterinary",
        website: "javascript:alert(1)",
      },
    },
    {
      type: "node",
      id: 901001,
      tags: {
        name: "Duplicata Sintética",
        amenity: "veterinary",
      },
    },
  ],
};
