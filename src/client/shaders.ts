export const gridFragShader = `
    precision highp float;

    varying vec2 vTextureCoord;
    
    uniform vec4 inputSize;
    uniform vec4 outputFrame;

    uniform vec2 uSize;
    uniform vec2 uWorldPosition;
    uniform float uGridSquareSize;

    void main(void) {
        vec2 worldPos = vTextureCoord * inputSize.xy / outputFrame.zw * uSize + uWorldPosition;
                    
        vec3 grid = vec3(1.0, 1.0, 1.0);
        vec4 color = vec4(0.0);

        vec2 b = worldPos / uGridSquareSize;
        
        float t = 0.0;
        float lineSize = 0.06;
        float alpha = 0.5;
        
        float xx = abs(b.x - floor(0.5 + b.x));
        float yy = abs(b.y - floor(0.5 + b.y));
        if (xx < lineSize) {
            if (yy < xx) {                    
                t += ((lineSize - yy) / lineSize);
            }
            else {                    
                t += ((lineSize - xx) / lineSize);
            }
        }
        else if (yy < lineSize) {
            if (xx < yy) {                    
                t += ((lineSize - xx) / lineSize);
            }
            else {                    
                t += ((lineSize - yy) / lineSize);
            }
        }

        color = vec4(0.0, 0.0, 0.0, t * alpha);
        // if (t != 0.0) {
        //     color.x += (sin(b.y / 5.0) + 1.0) * 0.5;
        //     // color.y += (cos(b.x / 5.0) + 1.0) * 0.5;
        //     // color.z += cos(b.x / 5.0);
        // }
        
        gl_FragColor = color;
    }
`
