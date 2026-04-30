<?xml version="1.0" encoding="UTF-8"?>
<sld:StyledLayerDescriptor
  version="1.0.0"
  xmlns="http://www.opengis.net/sld"
  xmlns:sld="http://www.opengis.net/sld"
  xmlns:ogc="http://www.opengis.net/ogc"
  xmlns:xlink="http://www.w3.org/1999/xlink"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">

  <sld:NamedLayer>
    <sld:Name>datos_delitos_lesiones_dolosas_secretariado</sld:Name>

    <sld:UserStyle>
      <sld:Title>Lesiones dolosas (tasa)</sld:Title>
      <sld:Abstract>Unidades: carpetas por cada 100 mil habitantes</sld:Abstract>

      <sld:FeatureTypeStyle>

    <sld:Rule>
      <sld:Name>c1</sld:Name>
      <sld:Title>0</sld:Title>
      <ogc:Filter>

        <ogc:And>

          <ogc:PropertyIsGreaterThanOrEqualTo>
            <ogc:PropertyName>tasa_carpetas_investigacion</ogc:PropertyName>
            <ogc:Literal>0</ogc:Literal>
          </ogc:PropertyIsGreaterThanOrEqualTo>

          <ogc:PropertyIsLessThan>
            <ogc:PropertyName>tasa_carpetas_investigacion</ogc:PropertyName>
            <ogc:Literal>0</ogc:Literal>
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
          <sld:CssParameter name="fill">#F1F6FF</sld:CssParameter>
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
      <sld:Title>0 a 2</sld:Title>
      <ogc:Filter>

        <ogc:And>

          <ogc:PropertyIsGreaterThanOrEqualTo>
            <ogc:PropertyName>tasa_carpetas_investigacion</ogc:PropertyName>
            <ogc:Literal>0</ogc:Literal>
          </ogc:PropertyIsGreaterThanOrEqualTo>

          <ogc:PropertyIsLessThan>
            <ogc:PropertyName>tasa_carpetas_investigacion</ogc:PropertyName>
            <ogc:Literal>2</ogc:Literal>
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
          <sld:CssParameter name="fill">#B7D2FF</sld:CssParameter>
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
      <sld:Title>2 a 5</sld:Title>
      <ogc:Filter>

        <ogc:And>

          <ogc:PropertyIsGreaterThanOrEqualTo>
            <ogc:PropertyName>tasa_carpetas_investigacion</ogc:PropertyName>
            <ogc:Literal>2</ogc:Literal>
          </ogc:PropertyIsGreaterThanOrEqualTo>

          <ogc:PropertyIsLessThan>
            <ogc:PropertyName>tasa_carpetas_investigacion</ogc:PropertyName>
            <ogc:Literal>5</ogc:Literal>
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
          <sld:CssParameter name="fill">#7EADFF</sld:CssParameter>
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
      <sld:Title>5 a 10</sld:Title>
      <ogc:Filter>

        <ogc:And>

          <ogc:PropertyIsGreaterThanOrEqualTo>
            <ogc:PropertyName>tasa_carpetas_investigacion</ogc:PropertyName>
            <ogc:Literal>5</ogc:Literal>
          </ogc:PropertyIsGreaterThanOrEqualTo>

          <ogc:PropertyIsLessThan>
            <ogc:PropertyName>tasa_carpetas_investigacion</ogc:PropertyName>
            <ogc:Literal>10</ogc:Literal>
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
          <sld:CssParameter name="fill">#4286FF</sld:CssParameter>
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
      <sld:Title>10 a 15</sld:Title>
      <ogc:Filter>

        <ogc:And>

          <ogc:PropertyIsGreaterThanOrEqualTo>
            <ogc:PropertyName>tasa_carpetas_investigacion</ogc:PropertyName>
            <ogc:Literal>10</ogc:Literal>
          </ogc:PropertyIsGreaterThanOrEqualTo>

          <ogc:PropertyIsLessThan>
            <ogc:PropertyName>tasa_carpetas_investigacion</ogc:PropertyName>
            <ogc:Literal>15</ogc:Literal>
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
          <sld:CssParameter name="fill">#165DD7</sld:CssParameter>
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
      <sld:Title>15 a 20</sld:Title>
      <ogc:Filter>

        <ogc:And>

          <ogc:PropertyIsGreaterThanOrEqualTo>
            <ogc:PropertyName>tasa_carpetas_investigacion</ogc:PropertyName>
            <ogc:Literal>15</ogc:Literal>
          </ogc:PropertyIsGreaterThanOrEqualTo>

          <ogc:PropertyIsLessThan>
            <ogc:PropertyName>tasa_carpetas_investigacion</ogc:PropertyName>
            <ogc:Literal>20</ogc:Literal>
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
          <sld:CssParameter name="fill">#003C9E</sld:CssParameter>
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
      <sld:Title>&gt; 20</sld:Title>
      <ogc:Filter>

          <ogc:PropertyIsGreaterThanOrEqualTo>
            <ogc:PropertyName>tasa_carpetas_investigacion</ogc:PropertyName>
            <ogc:Literal>20</ogc:Literal>
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
          <sld:CssParameter name="fill">#002262</sld:CssParameter>
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
          <ogc:PropertyName>tasa_carpetas_investigacion</ogc:PropertyName>
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