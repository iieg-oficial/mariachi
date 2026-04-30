<?xml version="1.0" encoding="UTF-8"?>
<sld:StyledLayerDescriptor
  version="1.0.0"
  xmlns="http://www.opengis.net/sld"
  xmlns:sld="http://www.opengis.net/sld"
  xmlns:ogc="http://www.opengis.net/ogc"
  xmlns:xlink="http://www.w3.org/1999/xlink"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">

  <sld:NamedLayer>
    <sld:Name>edad_mediana</sld:Name>

    <sld:UserStyle>
      <sld:Title>Edad mediana</sld:Title>
      <sld:Abstract>Unidades: años</sld:Abstract>

      <sld:FeatureTypeStyle>

    <sld:Rule>
      <sld:Name>c1</sld:Name>
      <sld:Title>0 a 18</sld:Title>
      <ogc:Filter>

        <ogc:And>

          <ogc:PropertyIsGreaterThanOrEqualTo>
            <ogc:PropertyName>valor</ogc:PropertyName>
            <ogc:Literal>0</ogc:Literal>
          </ogc:PropertyIsGreaterThanOrEqualTo>

          <ogc:PropertyIsLessThan>
            <ogc:PropertyName>valor</ogc:PropertyName>
            <ogc:Literal>18</ogc:Literal>
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
          <sld:CssParameter name="fill">#0450CA</sld:CssParameter>
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
      <sld:Title>18 a 22</sld:Title>
      <ogc:Filter>

        <ogc:And>

          <ogc:PropertyIsGreaterThanOrEqualTo>
            <ogc:PropertyName>valor</ogc:PropertyName>
            <ogc:Literal>18</ogc:Literal>
          </ogc:PropertyIsGreaterThanOrEqualTo>

          <ogc:PropertyIsLessThan>
            <ogc:PropertyName>valor</ogc:PropertyName>
            <ogc:Literal>22</ogc:Literal>
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
          <sld:CssParameter name="fill">#367CF8</sld:CssParameter>
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
      <sld:Title>22 a 26</sld:Title>
      <ogc:Filter>

        <ogc:And>

          <ogc:PropertyIsGreaterThanOrEqualTo>
            <ogc:PropertyName>valor</ogc:PropertyName>
            <ogc:Literal>22</ogc:Literal>
          </ogc:PropertyIsGreaterThanOrEqualTo>

          <ogc:PropertyIsLessThan>
            <ogc:PropertyName>valor</ogc:PropertyName>
            <ogc:Literal>26</ogc:Literal>
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
          <sld:CssParameter name="fill">#75A7FF</sld:CssParameter>
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
      <sld:Title>26 a 30</sld:Title>
      <ogc:Filter>

        <ogc:And>

          <ogc:PropertyIsGreaterThanOrEqualTo>
            <ogc:PropertyName>valor</ogc:PropertyName>
            <ogc:Literal>26</ogc:Literal>
          </ogc:PropertyIsGreaterThanOrEqualTo>

          <ogc:PropertyIsLessThan>
            <ogc:PropertyName>valor</ogc:PropertyName>
            <ogc:Literal>30</ogc:Literal>
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
          <sld:CssParameter name="fill">#B3CFFF</sld:CssParameter>
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
      <sld:Title>30 a 34</sld:Title>
      <ogc:Filter>

        <ogc:And>

          <ogc:PropertyIsGreaterThanOrEqualTo>
            <ogc:PropertyName>valor</ogc:PropertyName>
            <ogc:Literal>30</ogc:Literal>
          </ogc:PropertyIsGreaterThanOrEqualTo>

          <ogc:PropertyIsLessThan>
            <ogc:PropertyName>valor</ogc:PropertyName>
            <ogc:Literal>34</ogc:Literal>
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
          <sld:CssParameter name="fill">#EADFE2</sld:CssParameter>
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
      <sld:Title>34 a 38</sld:Title>
      <ogc:Filter>

        <ogc:And>

          <ogc:PropertyIsGreaterThanOrEqualTo>
            <ogc:PropertyName>valor</ogc:PropertyName>
            <ogc:Literal>34</ogc:Literal>
          </ogc:PropertyIsGreaterThanOrEqualTo>

          <ogc:PropertyIsLessThan>
            <ogc:PropertyName>valor</ogc:PropertyName>
            <ogc:Literal>38</ogc:Literal>
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
          <sld:CssParameter name="fill">#FFC198</sld:CssParameter>
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
      <sld:Title>38 a 42</sld:Title>
      <ogc:Filter>

        <ogc:And>

          <ogc:PropertyIsGreaterThanOrEqualTo>
            <ogc:PropertyName>valor</ogc:PropertyName>
            <ogc:Literal>38</ogc:Literal>
          </ogc:PropertyIsGreaterThanOrEqualTo>

          <ogc:PropertyIsLessThan>
            <ogc:PropertyName>valor</ogc:PropertyName>
            <ogc:Literal>42</ogc:Literal>
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
          <sld:CssParameter name="fill">#F88C38</sld:CssParameter>
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
      <sld:Name>c8</sld:Name>
      <sld:Title>42 a 46</sld:Title>
      <ogc:Filter>

        <ogc:And>

          <ogc:PropertyIsGreaterThanOrEqualTo>
            <ogc:PropertyName>valor</ogc:PropertyName>
            <ogc:Literal>42</ogc:Literal>
          </ogc:PropertyIsGreaterThanOrEqualTo>

          <ogc:PropertyIsLessThan>
            <ogc:PropertyName>valor</ogc:PropertyName>
            <ogc:Literal>46</ogc:Literal>
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
          <sld:CssParameter name="fill">#C56400</sld:CssParameter>
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
      <sld:Name>c9</sld:Name>
      <sld:Title>&gt; 46</sld:Title>
      <ogc:Filter>

          <ogc:PropertyIsGreaterThanOrEqualTo>
            <ogc:PropertyName>valor</ogc:PropertyName>
            <ogc:Literal>46</ogc:Literal>
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
          <sld:CssParameter name="fill">#8D4600</sld:CssParameter>
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