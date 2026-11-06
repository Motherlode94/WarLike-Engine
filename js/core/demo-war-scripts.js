const script=(id,name,source)=>({scriptId:'demo-wls-'+id,name,source,enabled:true,values:{}});
export const demoWarScripts={
 town:()=>script('relay','Relais.wls','// La quête Blueprint alimente cette lumière.\npublic float intensity = 2;\nprivate float phase = 0;\nUpdate() {\n    if (Get("demoPowered") == 1) {\n        phase += Time.deltaTime;\n        light.intensity = intensity + Mathf.Sin(phase * 3) * 0.25;\n    }\n}\n'),
 garage:()=>script('car','Prototype.wls','// Réglages appliqués au véritable véhicule.\npublic float maxSpeed = 270;\npublic float braking = 300;\nStart() {\n    vehicle.maxSpeed = maxSpeed;\n    vehicle.brakeForce = braking;\n    Log("Prototype prêt : quatre points à franchir dans l’ordre.");\n}\n'),
 nature:()=>script('dawn','PremiereAube.wls','// Vitesse du cycle de survie, en secondes de jeu par seconde réelle.\npublic float timeScale = 240;\nStart() {\n    world.timeScale = timeScale;\n}\n'),
 platformer:()=>script('courier','Coursier.wls','// Ajuste le saut et la course sans modifier le contrôleur du moteur.\npublic float jump = 470;\npublic float sprint = 295;\nStart() {\n    controller.jumpSpeed = jump;\n    controller.sprintSpeed = sprint;\n}\n')
};
