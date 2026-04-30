<?xml version="1.0" encoding="UTF-8"?>
<sld:StyledLayerDescriptor
  version="1.0.0"
  xmlns="http://www.opengis.net/sld"
  xmlns:sld="http://www.opengis.net/sld"
  xmlns:ogc="http://www.opengis.net/ogc"
  xmlns:xlink="http://www.w3.org/1999/xlink"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">

  <sld:NamedLayer>
    <sld:Name>poblacion_mujeres</sld:Name>

    <sld:UserStyle>
      <sld:Title>Población femenina estimada</sld:Title>
      <sld:Abstract>Unidades: mujeres</sld:Abstract>

      <sld:FeatureTypeStyle>

    <sld:Rule>
      <sld:Name>c1</sld:Name>
      <sld:Title>0 a 1 250</sld:Title>
      <ogc:Filter>

        <ogc:And>

          <ogc:PropertyIsGreaterThanOrEqualTo>
            <ogc:PropertyName>valor</ogc:PropertyName>
            <ogc:Literal>0</ogc:Literal>
          </ogc:PropertyIsGreaterThanOrEqualTo>

          <ogc:PropertyIsLessThan>
            <ogc:PropertyName>valor</ogc:PropertyName>
            <ogc:Literal>1250</ogc:Literal>
          </ogc:PropertyIsLessThan>
        </ogc:And>
      </ogc:Filter>

      <sld:PolygonSymbolizer>

        <sld:Geometry>
          <ogc:Function name="property">
            <ogc:Function name="env">
              <ogc:Literal>geom</ogc:Literal>
              <ogc:Literal>geom_iieg</ogc:Literal>
            </ogc:Function>
          </ogc:Function>
        </sld:Geometry>
        <sld:Fill>
          <sld:CssParameter name="fill">#F9F4FF</sld:CssParameter>
          <sld:CssParameter name="fill-opacity">1.0</sld:CssParameter>
        </sld:Fill>
        <sld:Stroke>
          <sld:CssParameter name="stroke">#FFFFFF</sld:CssParameter>
          <sld:CssParameter name="stroke-width">0.35</sld:CssParameter>
          <sld:CssParameter name="stroke-opacity">1.0</sld:CssParameter>
          <sld:CssParameter name="stroke-linejoin">bevel</sld:CssParameter>
        </sld:Stroke>
      </sld:PolygonSymbolizer>
    </sld:Rule>

    <sld:Rule>
      <sld:Name>c2</sld:Name>
      <sld:Title>1 250 a 5 000</sld:Title>
      <ogc:Filter>

        <ogc:And>

          <ogc:PropertyIsGreaterThanOrEqualTo>
            <ogc:PropertyName>valor</ogc:PropertyName>
            <ogc:Literal>1250</ogc:Literal>
          </ogc:PropertyIsGreaterThanOrEqualTo>

          <ogc:PropertyIsLessThan>
            <ogc:PropertyName>valor</ogc:PropertyName>
            <ogc:Literal>5000</ogc:Literal>
          </ogc:PropertyIsLessThan>
        </ogc:And>
      </ogc:Filter>

      <sld:PolygonSymbolizer>

        <sld:Geometry>
          <ogc:Function name="property">
            <ogc:Function name="env">
              <ogc:Literal>geom</ogc:Literal>
              <ogc:Literal>geom_iieg</ogc:Literal>
            </ogc:Function>
          </ogc:Function>
        </sld:Geometry>
        <sld:Fill>
          <sld:CssParameter name="fill">#E9D3FF</sld:CssParameter>
          <sld:CssParameter name="fill-opacity">1.0</sld:CssParameter>
        </sld:Fill>
        <sld:Stroke>
          <sld:CssParameter name="stroke">#FFFFFF</sld:CssParameter>
          <sld:CssParameter name="stroke-width">0.35</sld:CssParameter>
          <sld:CssParameter name="stroke-opacity">1.0</sld:CssParameter>
          <sld:CssParameter name="stroke-linejoin">bevel</sld:CssParameter>
        </sld:Stroke>
      </sld:PolygonSymbolizer>
    </sld:Rule>

    <sld:Rule>
      <sld:Name>c3</sld:Name>
      <sld:Title>5 000 a 12 500</sld:Title>
      <ogc:Filter>

        <ogc:And>

          <ogc:PropertyIsGreaterThanOrEqualTo>
            <ogc:PropertyName>valor</ogc:PropertyName>
            <ogc:Literal>5000</ogc:Literal>
          </ogc:PropertyIsGreaterThanOrEqualTo>

          <ogc:PropertyIsLessThan>
            <ogc:PropertyName>valor</ogc:PropertyName>
            <ogc:Literal>12500</ogc:Literal>
          </ogc:PropertyIsLessThan>
        </ogc:And>
      </ogc:Filter>

      <sld:PolygonSymbolizer>

        <sld:Geometry>
          <ogc:Function name="property">
            <ogc:Function name="env">
              <ogc:Literal>geom</ogc:Literal>
              <ogc:Literal>geom_iieg</ogc:Literal>
            </ogc:Function>
          </ogc:Function>
        </sld:Geometry>
        <sld:Fill>
          <sld:CssParameter name="fill">#DAB1FF</sld:CssParameter>
          <sld:CssParameter name="fill-opacity">1.0</sld:CssParameter>
        </sld:Fill>
        <sld:Stroke>
          <sld:CssParameter name="stroke">#FFFFFF</sld:CssParameter>
          <sld:CssParameter name="stroke-width">0.35</sld:CssParameter>
          <sld:CssParameter name="stroke-opacity">1.0</sld:CssParameter>
          <sld:CssParameter name="stroke-linejoin">bevel</sld:CssParameter>
        </sld:Stroke>
      </sld:PolygonSymbolizer>
    </sld:Rule>

    <sld:Rule>
      <sld:Name>c4</sld:Name>
      <sld:Title>12 500 a 50 000</sld:Title>
      <ogc:Filter>

        <ogc:And>

          <ogc:PropertyIsGreaterThanOrEqualTo>
            <ogc:PropertyName>valor</ogc:PropertyName>
            <ogc:Literal>12500</ogc:Literal>
          </ogc:PropertyIsGreaterThanOrEqualTo>

          <ogc:PropertyIsLessThan>
            <ogc:PropertyName>valor</ogc:PropertyName>
            <ogc:Literal>50000</ogc:Literal>
          </ogc:PropertyIsLessThan>
        </ogc:And>
      </ogc:Filter>

      <sld:PolygonSymbolizer>

        <sld:Geometry>
          <ogc:Function name="property">
            <ogc:Function name="env">
              <ogc:Literal>geom</ogc:Literal>
              <ogc:Literal>geom_iieg</ogc:Literal>
            </ogc:Function>
          </ogc:Function>
        </sld:Geometry>
        <sld:Fill>
          <sld:CssParameter name="fill">#CB8EFF</sld:CssParameter>
          <sld:CssParameter name="fill-opacity">1.0</sld:CssParameter>
        </sld:Fill>
        <sld:Stroke>
          <sld:CssParameter name="stroke">#FFFFFF</sld:CssParameter>
          <sld:CssParameter name="stroke-width">0.35</sld:CssParameter>
          <sld:CssParameter name="stroke-opacity">1.0</sld:CssParameter>
          <sld:CssParameter name="stroke-linejoin">bevel</sld:CssParameter>
        </sld:Stroke>
      </sld:PolygonSymbolizer>
    </sld:Rule>

    <sld:Rule>
      <sld:Name>c5</sld:Name>
      <sld:Title>50 000 a 125 000</sld:Title>
      <ogc:Filter>

        <ogc:And>

          <ogc:PropertyIsGreaterThanOrEqualTo>
            <ogc:PropertyName>valor</ogc:PropertyName>
            <ogc:Literal>50000</ogc:Literal>
          </ogc:PropertyIsGreaterThanOrEqualTo>

          <ogc:PropertyIsLessThan>
            <ogc:PropertyName>valor</ogc:PropertyName>
            <ogc:Literal>125000</ogc:Literal>
          </ogc:PropertyIsLessThan>
        </ogc:And>
      </ogc:Filter>

      <sld:PolygonSymbolizer>

        <sld:Geometry>
          <ogc:Function name="property">
            <ogc:Function name="env">
              <ogc:Literal>geom</ogc:Literal>
              <ogc:Literal>geom_iieg</ogc:Literal>
            </ogc:Function>
          </ogc:Function>
        </sld:Geometry>
        <sld:Fill>
          <sld:CssParameter name="fill">#B56DED</sld:CssParameter>
          <sld:CssParameter name="fill-opacity">1.0</sld:CssParameter>
        </sld:Fill>
        <sld:Stroke>
          <sld:CssParameter name="stroke">#FFFFFF</sld:CssParameter>
          <sld:CssParameter name="stroke-width">0.35</sld:CssParameter>
          <sld:CssParameter name="stroke-opacity">1.0</sld:CssParameter>
          <sld:CssParameter name="stroke-linejoin">bevel</sld:CssParameter>
        </sld:Stroke>
      </sld:PolygonSymbolizer>
    </sld:Rule>

    <sld:Rule>
      <sld:Name>c6</sld:Name>
      <sld:Title>125 000 a 500 000</sld:Title>
      <ogc:Filter>

        <ogc:And>

          <ogc:PropertyIsGreaterThanOrEqualTo>
            <ogc:PropertyName>valor</ogc:PropertyName>
            <ogc:Literal>125000</ogc:Literal>
          </ogc:PropertyIsGreaterThanOrEqualTo>

          <ogc:PropertyIsLessThan>
            <ogc:PropertyName>valor</ogc:PropertyName>
            <ogc:Literal>500000</ogc:Literal>
          </ogc:PropertyIsLessThan>
        </ogc:And>
      </ogc:Filter>

      <sld:PolygonSymbolizer>

        <sld:Geometry>
          <ogc:Function name="property">
            <ogc:Function name="env">
              <ogc:Literal>geom</ogc:Literal>
              <ogc:Literal>geom_iieg</ogc:Literal>
            </ogc:Function>
          </ogc:Function>
        </sld:Geometry>
        <sld:Fill>
          <sld:CssParameter name="fill">#9951CF</sld:CssParameter>
          <sld:CssParameter name="fill-opacity">1.0</sld:CssParameter>
        </sld:Fill>
        <sld:Stroke>
          <sld:CssParameter name="stroke">#FFFFFF</sld:CssParameter>
          <sld:CssParameter name="stroke-width">0.35</sld:CssParameter>
          <sld:CssParameter name="stroke-opacity">1.0</sld:CssParameter>
          <sld:CssParameter name="stroke-linejoin">bevel</sld:CssParameter>
        </sld:Stroke>
      </sld:PolygonSymbolizer>
    </sld:Rule>

    <sld:Rule>
      <sld:Name>c7</sld:Name>
      <sld:Title>&gt; 500 000</sld:Title>
      <ogc:Filter>

          <ogc:PropertyIsGreaterThanOrEqualTo>
            <ogc:PropertyName>valor</ogc:PropertyName>
            <ogc:Literal>500000</ogc:Literal>
          </ogc:PropertyIsGreaterThanOrEqualTo>
      </ogc:Filter>

      <sld:PolygonSymbolizer>

        <sld:Geometry>
          <ogc:Function name="property">
            <ogc:Function name="env">
              <ogc:Literal>geom</ogc:Literal>
              <ogc:Literal>geom_iieg</ogc:Literal>
            </ogc:Function>
          </ogc:Function>
        </sld:Geometry>
        <sld:Fill>
          <sld:CssParameter name="fill">#7E33B1</sld:CssParameter>
          <sld:CssParameter name="fill-opacity">1.0</sld:CssParameter>
        </sld:Fill>
        <sld:Stroke>
          <sld:CssParameter name="stroke">#FFFFFF</sld:CssParameter>
          <sld:CssParameter name="stroke-width">0.35</sld:CssParameter>
          <sld:CssParameter name="stroke-opacity">1.0</sld:CssParameter>
          <sld:CssParameter name="stroke-linejoin">bevel</sld:CssParameter>
        </sld:Stroke>
      </sld:PolygonSymbolizer>
    </sld:Rule>

    <sld:Rule>
      <sld:Name>null</sld:Name>
      <sld:Title>Sin dato</sld:Title>
      <ogc:Filter>
        <ogc:PropertyIsNull>
          <ogc:PropertyName>valor</ogc:PropertyName>
        </ogc:PropertyIsNull>
      </ogc:Filter>

      <sld:PolygonSymbolizer>

        <sld:Geometry>
          <ogc:Function name="property">
            <ogc:Function name="env">
              <ogc:Literal>geom</ogc:Literal>
              <ogc:Literal>geom_iieg</ogc:Literal>
            </ogc:Function>
          </ogc:Function>
        </sld:Geometry>
        <sld:Fill>
          <sld:CssParameter name="fill">#FFFFFF</sld:CssParameter>
          <sld:CssParameter name="fill-opacity">1.0</sld:CssParameter>
        </sld:Fill>
      </sld:PolygonSymbolizer>

      <sld:PolygonSymbolizer>

        <sld:Geometry>
          <ogc:Function name="property">
            <ogc:Function name="env">
              <ogc:Literal>geom</ogc:Literal>
              <ogc:Literal>geom_iieg</ogc:Literal>
            </ogc:Function>
          </ogc:Function>
        </sld:Geometry>
        <sld:Fill>
          <sld:GraphicFill>
            <sld:Graphic>
              <sld:Mark>
                <sld:WellKnownName>shape://times</sld:WellKnownName>
                <sld:Stroke>
                  <sld:CssParameter name="stroke">#7A7A7A</sld:CssParameter>
                  <sld:CssParameter name="stroke-width">1.0</sld:CssParameter>
                  <sld:CssParameter name="stroke-opacity">1.0</sld:CssParameter>
                </sld:Stroke>
              </sld:Mark>
              <sld:Size>7</sld:Size>
            </sld:Graphic>
          </sld:GraphicFill>
        </sld:Fill>

        <sld:Stroke>
          <sld:CssParameter name="stroke">#7A7A7A</sld:CssParameter>
          <sld:CssParameter name="stroke-width">0.35</sld:CssParameter>
          <sld:CssParameter name="stroke-opacity">1.0</sld:CssParameter>
          <sld:CssParameter name="stroke-linejoin">bevel</sld:CssParameter>
        </sld:Stroke>
      </sld:PolygonSymbolizer>
    </sld:Rule>
      </sld:FeatureTypeStyle>

    </sld:UserStyle>
  </sld:NamedLayer>
</sld:StyledLayerDescriptor>