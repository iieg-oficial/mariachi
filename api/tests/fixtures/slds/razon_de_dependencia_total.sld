<?xml version="1.0" encoding="UTF-8"?>
<sld:StyledLayerDescriptor
  version="1.0.0"
  xmlns="http://www.opengis.net/sld"
  xmlns:sld="http://www.opengis.net/sld"
  xmlns:ogc="http://www.opengis.net/ogc"
  xmlns:xlink="http://www.w3.org/1999/xlink"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">

  <sld:NamedLayer>
    <sld:Name>razon_dependencia</sld:Name>

    <sld:UserStyle>
      <sld:Title>Razón de dependencia total</sld:Title>
      

      <sld:FeatureTypeStyle>

    <sld:Rule>
      <sld:Name>c1</sld:Name>
      <sld:Title>15 a 40</sld:Title>
      <ogc:Filter>

        <ogc:And>

          <ogc:PropertyIsGreaterThanOrEqualTo>
            <ogc:PropertyName>valor</ogc:PropertyName>
            <ogc:Literal>15</ogc:Literal>
          </ogc:PropertyIsGreaterThanOrEqualTo>

          <ogc:PropertyIsLessThan>
            <ogc:PropertyName>valor</ogc:PropertyName>
            <ogc:Literal>40</ogc:Literal>
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
          <sld:CssParameter name="fill">#FFF3F3</sld:CssParameter>
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
      <sld:Title>40 a 50</sld:Title>
      <ogc:Filter>

        <ogc:And>

          <ogc:PropertyIsGreaterThanOrEqualTo>
            <ogc:PropertyName>valor</ogc:PropertyName>
            <ogc:Literal>40</ogc:Literal>
          </ogc:PropertyIsGreaterThanOrEqualTo>

          <ogc:PropertyIsLessThan>
            <ogc:PropertyName>valor</ogc:PropertyName>
            <ogc:Literal>50</ogc:Literal>
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
          <sld:CssParameter name="fill">#FFC9BA</sld:CssParameter>
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
      <sld:Title>50 a 60</sld:Title>
      <ogc:Filter>

        <ogc:And>

          <ogc:PropertyIsGreaterThanOrEqualTo>
            <ogc:PropertyName>valor</ogc:PropertyName>
            <ogc:Literal>50</ogc:Literal>
          </ogc:PropertyIsGreaterThanOrEqualTo>

          <ogc:PropertyIsLessThan>
            <ogc:PropertyName>valor</ogc:PropertyName>
            <ogc:Literal>60</ogc:Literal>
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
          <sld:CssParameter name="fill">#FFA16E</sld:CssParameter>
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
      <sld:Title>60 a 70</sld:Title>
      <ogc:Filter>

        <ogc:And>

          <ogc:PropertyIsGreaterThanOrEqualTo>
            <ogc:PropertyName>valor</ogc:PropertyName>
            <ogc:Literal>60</ogc:Literal>
          </ogc:PropertyIsGreaterThanOrEqualTo>

          <ogc:PropertyIsLessThan>
            <ogc:PropertyName>valor</ogc:PropertyName>
            <ogc:Literal>70</ogc:Literal>
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
          <sld:CssParameter name="fill">#D78538</sld:CssParameter>
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
      <sld:Title>70 a 90</sld:Title>
      <ogc:Filter>

        <ogc:And>

          <ogc:PropertyIsGreaterThanOrEqualTo>
            <ogc:PropertyName>valor</ogc:PropertyName>
            <ogc:Literal>70</ogc:Literal>
          </ogc:PropertyIsGreaterThanOrEqualTo>

          <ogc:PropertyIsLessThan>
            <ogc:PropertyName>valor</ogc:PropertyName>
            <ogc:Literal>90</ogc:Literal>
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
          <sld:CssParameter name="fill">#AB6A00</sld:CssParameter>
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
      <sld:Title>90 a 110</sld:Title>
      <ogc:Filter>

        <ogc:And>

          <ogc:PropertyIsGreaterThanOrEqualTo>
            <ogc:PropertyName>valor</ogc:PropertyName>
            <ogc:Literal>90</ogc:Literal>
          </ogc:PropertyIsGreaterThanOrEqualTo>

          <ogc:PropertyIsLessThan>
            <ogc:PropertyName>valor</ogc:PropertyName>
            <ogc:Literal>110</ogc:Literal>
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
          <sld:CssParameter name="fill">#7E5300</sld:CssParameter>
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
      <sld:Title>&gt; 110</sld:Title>
      <ogc:Filter>

          <ogc:PropertyIsGreaterThanOrEqualTo>
            <ogc:PropertyName>valor</ogc:PropertyName>
            <ogc:Literal>110</ogc:Literal>
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
          <sld:CssParameter name="fill">#563A00</sld:CssParameter>
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